// Logic that runs inside the workflows' Code nodes. build.mjs copies each function's source into the node,
// so every function must be self-contained: no imports and no references to anything outside its own body.
// Functions that work with dates take Luxon's DateTime as an argument (n8n provides it as a global).

/** Turns a lead from a form, a webhook or Facebook Lead Ads into one shape. */
export function normalizeLead(input, source, nowIso) {
  const flat = {};
  const add = (obj) => {
    for (const [k, v] of Object.entries(obj || {})) {
      if (v && typeof v === "object" && !Array.isArray(v)) continue;
      flat[k.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")] = Array.isArray(v) ? v.join(", ") : v;
    }
  };
  add(input);
  add(input && input.body);
  add(input && input.data);
  const pick = (...keys) => {
    for (const k of keys) if (flat[k] != null && String(flat[k]).trim() !== "") return String(flat[k]).trim();
    return "";
  };
  const first = pick("first_name", "firstname");
  const last = pick("last_name", "lastname");
  const name = pick("name", "full_name", "fullname", "your_name") || [first, last].filter(Boolean).join(" ");
  const email = pick("email", "email_address", "your_email", "e_mail").toLowerCase();
  const lead = {
    lead_id: "L" + Date.parse(nowIso).toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(),
    received_at: nowIso,
    source,
    name,
    email,
    phone: pick("phone", "phone_number", "mobile", "telephone", "whatsapp"),
    company: pick("company", "company_name", "business", "organisation", "organization"),
    message: pick("message", "notes", "how_can_we_help", "comments", "enquiry", "inquiry", "details").slice(0, 4000),
    budget: pick("budget", "budget_range"),
  };
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return { ...lead, valid, problem: valid ? "" : "missing or invalid email" };
}

/** OpenAI request that scores a lead and drafts the first reply. */
export function buildQualifyRequest(lead, s) {
  const system = [
    `You qualify inbound leads for ${s.businessName}. ${s.businessDescription}`,
    `Ideal customer: ${s.idealCustomer}`,
    "Score the lead: hot = clear need and fit, ready to talk; warm = some fit or vague need; cold = poor fit, spam or no real need.",
    `Write a short, friendly first reply email in the lead's language, signed "${s.senderName}".`,
    `Invite them to book a call here: ${s.bookingLink}. Never promise prices, discounts or dates.`,
    'Answer with JSON only: {"score":"hot|warm|cold","reason":"...","summary":"one line","subject":"...","reply":"plain text email body"}',
  ].join("\n");
  const user = JSON.stringify({ name: lead.name, company: lead.company, message: lead.message, budget: lead.budget, source: lead.source });
  return {
    model: s.openAiModel,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  };
}

/** Reads the JSON answer from an OpenAI chat completion. */
export function readAiJson(response) {
  const content = response && response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content;
  if (!content) throw new Error("OpenAI returned no answer: " + JSON.stringify(response).slice(0, 300));
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("OpenAI answer was not valid JSON: " + content.slice(0, 300));
  }
}

/** Leads that were contacted, have not replied, and are due another follow-up. */
export function dueFollowUps(rows, nowIso, followUpDays, maxFollowUps) {
  const now = Date.parse(nowIso);
  return rows.filter((r) => {
    if (String(r.status).toLowerCase() !== "contacted" || !r.email) return false;
    const sent = Number(r.follow_ups || 0);
    const last = Date.parse(r.last_contact_at);
    return sent < maxFollowUps && Number.isFinite(last) && now - last >= followUpDays * 86400000;
  });
}

/** OpenAI request for follow-up number n. */
export function buildFollowUpRequest(row, n, s) {
  const system = [
    `You write follow-up emails for ${s.businessName}. ${s.businessDescription}`,
    `This is follow-up number ${n} to a lead who has not replied. Keep it under 80 words, polite, no pressure, in the lead's language.`,
    `Remind them of what they asked about and offer the booking link: ${s.bookingLink}. Sign as "${s.senderName}".`,
    'Answer with JSON only: {"subject":"...","reply":"plain text email body"}',
  ].join("\n");
  const user = JSON.stringify({ name: row.name, company: row.company, original_message: row.message, summary: row.summary });
  return {
    model: s.openAiModel,
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  };
}

/** "Jane Doe <Jane@Example.com>" -> "jane@example.com" */
export function emailAddress(from) {
  const text = String(from || "");
  const m = text.match(/<([^>]+)>/) || text.match(/([^\s<>"]+@[^\s<>"]+)/);
  return m ? m[1].trim().toLowerCase() : "";
}

/** Calendar events that start between hoursBefore and hoursBefore + 1 from now (the trigger runs hourly). */
export function dueReminders(events, nowIso, hoursBefore) {
  const now = Date.parse(nowIso);
  const from = now + hoursBefore * 3600000;
  const to = from + 3600000;
  const out = [];
  for (const e of events) {
    const start = Date.parse((e.start && (e.start.dateTime || e.start.date)) || "");
    if (!Number.isFinite(start) || start < from || start >= to || e.status === "cancelled") continue;
    const attendee = (e.attendees || []).find((a) => a.email && !a.self && !a.organizer);
    const fromDescription = String(e.description || "").match(/[^\s<>"]+@[^\s<>"]+\.[a-z]{2,}/i);
    const email = attendee ? attendee.email : fromDescription ? fromDescription[0] : "";
    if (email) out.push({ event_id: e.id, summary: e.summary || "Appointment", start: new Date(start).toISOString(), email });
  }
  return out;
}

/** Content-plan rows with status "idea" that are due within the next daysAhead days. */
export function contentToDraft(rows, nowIso, daysAhead) {
  const now = Date.parse(nowIso);
  return rows.filter((r) => {
    const at = Date.parse(r.publish_at);
    return String(r.status).toLowerCase() === "idea" && r.topic && Number.isFinite(at) && at >= now - 86400000 && at <= now + daysAhead * 86400000;
  });
}

/** OpenAI request that writes one post per network from a content-plan row. */
export function buildCaptionRequest(row, s) {
  const system = [
    `You are the social media writer for ${s.businessName}. ${s.businessDescription}`,
    `Brand voice: ${s.brandVoice}. Language: ${s.language}.`,
    "Write one post per network for the topic. Instagram: hook first line, up to 150 words, line breaks. Facebook: up to 100 words.",
    "LinkedIn: professional, up to 150 words. X: under 260 characters. No made-up facts, prices or statistics.",
    'Answer with JSON only: {"instagram":"...","facebook":"...","linkedin":"...","x":"...","hashtags":"#tag1 #tag2 ..."}',
  ].join("\n");
  const user = JSON.stringify({ topic: row.topic, notes: row.notes || "", call_to_action: row.call_to_action || s.defaultCallToAction });
  return {
    model: s.openAiModel,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  };
}

/** Approved posts whose publish time has passed. */
export function duePosts(rows, nowIso, status = "approved") {
  const now = Date.parse(nowIso);
  return rows.filter((r) => String(r.status).toLowerCase() === status && Date.parse(r.publish_at) <= now);
}

/** Collects the outcome of each publishing node for one post. */
export function publishOutcome(results) {
  const failed = results.filter((r) => r.enabled && r.error).map((r) => `${r.network}: ${r.error}`);
  const done = results.filter((r) => r.enabled && !r.error).map((r) => r.network);
  return {
    status: failed.length === 0 ? "published" : done.length ? "partly published" : "failed",
    published_to: done.join(", "),
    errors: failed.join(" | ").slice(0, 1000),
  };
}

/** Tool calls from a Vapi "tool-calls" server message. */
export function parseVapiToolCalls(body) {
  const message = (body && body.message) || body || {};
  const list = message.toolCallList || message.toolCalls || [];
  return list.map((c) => {
    const fn = c.function || {};
    let args = fn.arguments != null ? fn.arguments : c.arguments || {};
    if (typeof args === "string") {
      try { args = JSON.parse(args); } catch { args = {}; }
    }
    return { toolCallId: c.id, name: fn.name || c.name || "", args, caller_number: (message.call && message.call.customer && message.call.customer.number) || "" };
  });
}

/** Free appointment slots on one day, given that day's calendar events. */
export function freeSlots(DateTime, events, dateText, s) {
  const zone = s.timezone;
  const day = DateTime.fromISO(String(dateText).slice(0, 10), { zone });
  if (!day.isValid) return { date: dateText, slots: [], note: "I could not understand that date." };
  const openDays = String(s.openDays).split(",").map((d) => Number(d.trim()));
  if (!openDays.includes(day.weekday)) return { date: day.toISODate(), slots: [], note: "We are closed that day." };
  const [oh, om] = String(s.openTime).split(":").map(Number);
  const [ch, cm] = String(s.closeTime).split(":").map(Number);
  const open = day.set({ hour: oh, minute: om || 0 });
  const close = day.set({ hour: ch, minute: cm || 0 });
  const now = DateTime.now().setZone(zone);
  const busy = events
    .filter((e) => e.status !== "cancelled" && e.transparency !== "transparent")
    .map((e) => ({
      start: DateTime.fromISO((e.start && (e.start.dateTime || e.start.date)) || "", { zone }),
      end: DateTime.fromISO((e.end && (e.end.dateTime || e.end.date)) || "", { zone }),
    }))
    .filter((b) => b.start.isValid && b.end.isValid);
  const slots = [];
  for (let t = open; t.plus({ minutes: s.slotMinutes }) <= close; t = t.plus({ minutes: s.slotMinutes })) {
    const end = t.plus({ minutes: s.slotMinutes });
    if (t <= now.plus({ minutes: 60 })) continue;
    if (busy.some((b) => t < b.end && end > b.start)) continue;
    slots.push(t.toFormat("HH:mm"));
  }
  return { date: day.toISODate(), weekday: day.toFormat("cccc"), slots, note: slots.length ? "" : "No free slots that day." };
}

/** Start and end of a booking request in the business time zone, or an error message for the caller. */
export function bookingTimes(DateTime, args, s) {
  const start = DateTime.fromISO(`${String(args.date).slice(0, 10)}T${String(args.time).slice(0, 5)}`, { zone: s.timezone });
  if (!start.isValid) return { ok: false, message: "That date or time is not valid." };
  if (start < DateTime.now().setZone(s.timezone)) return { ok: false, message: "That time is in the past." };
  const end = start.plus({ minutes: s.slotMinutes });
  return { ok: true, start: start.toISO(), end: end.toISO(), label: start.toFormat("cccc d LLLL 'at' HH:mm") };
}

/** OpenAI content part for a document: PDFs as files, images as images. */
export function documentPart(mimeType, base64, fileName) {
  if (mimeType === "application/pdf") {
    return { type: "file", file: { filename: fileName || "document.pdf", file_data: `data:application/pdf;base64,${base64}` } };
  }
  if (/^image\/(png|jpe?g|webp|gif)$/.test(mimeType)) {
    return { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } };
  }
  return null;
}

/** OpenAI request that extracts invoice or receipt data from one document. */
export function buildExtractRequest(part, s) {
  const system = [
    "You extract data from invoices, receipts and bills. Read the document carefully. Never guess: use null when a value is missing or unreadable.",
    "Dates as YYYY-MM-DD. Amounts as numbers with a dot for decimals, no currency symbols. Currency as a 3-letter ISO code.",
    'Answer with JSON only: {"document_type":"invoice|receipt|credit_note|other","supplier_name":"","supplier_vat_id":null,"customer_name":null,',
    '"invoice_number":null,"invoice_date":null,"due_date":null,"currency":null,"subtotal":null,"vat_amount":null,"total":null,',
    '"line_items":[{"description":"","quantity":null,"unit_price":null,"amount":null}],"confidence":"high|medium|low"}',
  ].join("\n");
  return {
    model: s.openAiModel,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: [{ type: "text", text: "Extract the data from this document." }, part] },
    ],
  };
}

/** Checks extracted data and decides whether a person needs to review it. */
export function checkExtraction(x) {
  const issues = [];
  const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
  const subtotal = num(x.subtotal);
  const vat = num(x.vat_amount);
  const total = num(x.total);
  if (!x.supplier_name) issues.push("supplier missing");
  if (!x.invoice_date || !/^\d{4}-\d{2}-\d{2}$/.test(x.invoice_date)) issues.push("date missing");
  if (total === null || Number.isNaN(total)) issues.push("total missing");
  if (!x.currency) issues.push("currency missing");
  if (subtotal !== null && vat !== null && total !== null && Math.abs(subtotal + vat - total) > 0.02) {
    issues.push(`subtotal + VAT (${(subtotal + vat).toFixed(2)}) does not match total (${total.toFixed(2)})`);
  }
  const lines = Array.isArray(x.line_items) ? x.line_items : [];
  const lineSum = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  if (lines.length && subtotal !== null && Math.abs(lineSum - subtotal) > 0.05 && Math.abs(lineSum - (total || 0)) > 0.05) {
    issues.push("line items do not add up");
  }
  if (x.confidence === "low") issues.push("low confidence reading");
  return { status: issues.length ? "needs review" : "ok", issues: issues.join("; ") };
}

/** "2026-03-04_Acme-Ltd_INV-001.pdf" */
export function documentFileName(x, originalName) {
  const clean = (v) => String(v || "").normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const ext = (String(originalName || "").match(/\.[a-z0-9]{2,5}$/i) || [".pdf"])[0].toLowerCase();
  return [clean(x.invoice_date) || "undated", clean(x.supplier_name) || "unknown-supplier", clean(x.invoice_number) || "no-number"].join("_") + ext;
}

/** Turns alerts from Wazuh, Alertmanager/Grafana, AWS GuardDuty (via SNS) or a simple JSON body into one shape. */
export function normalizeAlerts(body, nowIso) {
  const sev = (n) => (n >= 12 ? "critical" : n >= 8 ? "high" : n >= 5 ? "medium" : "low");
  const word = (w) => {
    const v = String(w || "").toLowerCase();
    if (["critical", "crit", "emergency", "fatal", "p1"].includes(v)) return "critical";
    if (["high", "error", "major", "p2"].includes(v)) return "high";
    if (["medium", "warning", "warn", "moderate", "p3"].includes(v)) return "medium";
    return "low";
  };
  const ip = (text) => (String(text || "").match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/) || [""])[0];
  const out = [];
  let b = body || {};
  if (b.Type === "Notification" && typeof b.Message === "string") {
    try { b = JSON.parse(b.Message); } catch { b = { title: b.Subject, description: b.Message }; }
  }
  if (b.rule && b.agent) {
    out.push({
      source: "wazuh", title: b.rule.description || "Wazuh alert", severity: sev(Number(b.rule.level) || 0),
      host: b.agent.name || b.agent.ip || "", ip: (b.data && (b.data.srcip || b.data.src_ip)) || ip(b.full_log),
      rule: String(b.rule.id || ""), details: String(b.full_log || "").slice(0, 2000), at: b.timestamp || nowIso,
    });
  } else if (Array.isArray(b.alerts)) {
    for (const a of b.alerts) {
      if (a.status === "resolved") continue;
      const l = a.labels || {};
      const n = a.annotations || {};
      out.push({
        source: "alertmanager", title: l.alertname || n.summary || "Alert", severity: word(l.severity),
        host: l.instance || l.host || "", ip: ip(l.instance), rule: l.alertname || "",
        details: String(n.description || n.summary || "").slice(0, 2000), at: a.startsAt || nowIso,
      });
    }
  } else if (b["detail-type"] === "GuardDuty Finding" || (b.detail && b.detail.type && b.detail.severity !== undefined)) {
    const d = b.detail || {};
    const res = d.resource || {};
    const inst = res.instanceDetails || {};
    const remote = (((d.service || {}).action || {}).networkConnectionAction || {}).remoteIpDetails || {};
    out.push({
      source: "guardduty", title: d.title || d.type, severity: sev(Number(d.severity) * 1.2 || 0),
      host: inst.instanceId || res.resourceType || "", ip: remote.ipAddressV4 || "", rule: d.type || "",
      details: String(d.description || "").slice(0, 2000), at: d.updatedAt || nowIso,
    });
  } else {
    out.push({
      source: b.source || "webhook", title: b.title || b.name || b.alert || "Security alert", severity: word(b.severity || b.level || b.priority),
      host: b.host || b.hostname || b.server || "", ip: b.ip || b.src_ip || b.source_ip || ip(b.message || b.description),
      rule: String(b.rule || b.rule_id || b.title || ""), details: String(b.description || b.message || "").slice(0, 2000), at: b.timestamp || nowIso,
    });
  }
  return out.map((a) => ({ ...a, received_at: nowIso, key: `${a.source}|${a.rule}|${a.host}|${a.ip}` }));
}

/** Drops alerts seen with the same key in the last windowMinutes. store is the workflow's static data. */
export function dedupeAlerts(alerts, store, nowMs, windowMinutes) {
  store.seen = store.seen || {};
  for (const [k, t] of Object.entries(store.seen)) if (nowMs - t > windowMinutes * 60000) delete store.seen[k];
  const fresh = [];
  for (const a of alerts) {
    if (a.key in store.seen) continue;
    store.seen[a.key] = nowMs;
    fresh.push(a);
  }
  return fresh;
}

/** OpenAI request that triages one alert. */
export function buildTriageRequest(alert, reputation, s) {
  const system = [
    `You are a security analyst for ${s.organisationName}. Triage the alert for a small team without a dedicated SOC.`,
    "Use only the data given. Say clearly when something is uncertain. Recommended actions must be concrete and safe (no destructive steps).",
    'Answer with JSON only: {"severity":"critical|high|medium|low","summary":"one sentence","likely_cause":"...",',
    '"false_positive_likelihood":"high|medium|low","recommended_actions":["...","..."]}',
  ].join("\n");
  return {
    model: s.openAiModel,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify({ alert, ip_reputation: reputation }) }],
  };
}

/** Short IP reputation from a VirusTotal v3 IP report (or null when the lookup was skipped or failed). */
export function ipReputation(vt) {
  const a = vt && vt.data && vt.data.attributes;
  if (!a) return null;
  const s = a.last_analysis_stats || {};
  return { malicious: s.malicious || 0, suspicious: s.suspicious || 0, harmless: s.harmless || 0, country: a.country || "", owner: a.as_owner || "" };
}

/** Counts for the weekly security summary. */
export function weeklyStats(rows, nowIso) {
  const since = Date.parse(nowIso) - 7 * 86400000;
  const recent = rows.filter((r) => Date.parse(r.received_at) >= since);
  const count = (key) => recent.reduce((m, r) => ((m[r[key] || "unknown"] = (m[r[key] || "unknown"] || 0) + 1), m), {});
  const top = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} (${v})`);
  return {
    total: recent.length,
    by_severity: count("severity"),
    top_hosts: top(count("host")),
    top_alerts: top(count("title")),
    open_critical: recent.filter((r) => ["critical", "high"].includes(r.severity) && String(r.status).toLowerCase() !== "closed")
      .map((r) => `${r.received_at.slice(0, 10)} ${r.title} on ${r.host || "?"}`).slice(0, 20),
  };
}

// ------------------------------------------------------------------------------- catalog automations (8 to 18)

/** An email (Gmail trigger, full message) as an enquiry: sender, subject, plain text, thread. */
export function emailEnquiry(msg) {
  const from = (msg.from && msg.from.value && msg.from.value[0]) || {};
  const text = String(msg.text || msg.textPlain || msg.snippet || "")
    .split(/\n-{2,}\s*\n|\nOn .{5,80} wrote:\n/)[0]
    .replace(/\n{3,}/g, "\n\n").trim().slice(0, 4000);
  return {
    message_id: msg.id || "", thread_id: msg.threadId || "", email: String(from.address || "").toLowerCase(), name: from.name || "",
    subject: msg.subject || "", message: text, received_at: msg.date ? new Date(msg.date).toISOString() : new Date().toISOString(),
  };
}

/** OpenAI request that categorizes an enquiry and drafts a reply. */
export function buildEnquiryRequest(enquiry, s) {
  const system = [
    `You sort incoming enquiries for ${s.businessName}. ${s.businessDescription}`,
    `Categories: ${s.categories}. Priority: high (ready to buy, urgent, or large deal), normal, low (spam, unrelated, newsletters).`,
    `Draft a reply in the sender's language, signed "${s.senderName}". Answer only what you can from this context; otherwise say the team will follow up. Never promise prices or dates.`,
    'Answer with JSON only: {"category":"...","priority":"high|normal|low","summary":"one line","is_spam":false,"reply":"plain text email body"}',
  ].join("\n");
  return {
    model: s.openAiModel, temperature: 0.3, response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify({ from: enquiry.name || enquiry.email, subject: enquiry.subject, message: enquiry.message }) }],
  };
}


/** The company website to look at: the website field, or the email domain unless it is a free mail provider. */
export function companyDomain(email, website) {
  const free = ["gmail.com", "googlemail.com", "yahoo.com", "yahoo.fr", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr", "live.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "gmx.fr", "orange.fr", "free.fr", "laposte.net", "sfr.fr", "wanadoo.fr"];
  const fromSite = String(website || "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0].toLowerCase();
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(fromSite)) return fromSite;
  const domain = String(email || "").split("@")[1];
  if (!domain || free.includes(domain.toLowerCase())) return "";
  return domain.toLowerCase();
}

/** Visible text of an HTML page, without scripts, styles or tags. */
export function htmlToText(html, max = 6000) {
  return String(html || "")
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim().slice(0, max);
}

/** OpenAI request that enriches and scores a lead from its message and its company website. */
export function buildEnrichRequest(lead, siteText, s) {
  const system = [
    `You qualify B2B leads for ${s.businessName}. Ideal customer: ${s.idealCustomer}`,
    "Use only the lead's message and the website text given. If the website text is empty, say so and lower confidence.",
    "fit_score: 0 to 100, how well the company matches the ideal customer.",
    'Answer with JSON only: {"company_name":"","industry":"","company_size":"solo|small|medium|large|unknown","what_they_do":"one sentence","fit_score":0,"fit_reason":"one sentence","confidence":"high|medium|low"}',
  ].join("\n");
  return {
    model: s.openAiModel, temperature: 0.2, response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify({ lead: { name: lead.name, email: lead.email, company: lead.company, message: lead.message }, website: siteText }) }],
  };
}

/** Picks the salesperson: the first rule whose keyword appears in the industry or description, else the default. */
export function routeLead(enriched, rulesText, defaultOwner) {
  const haystack = `${enriched.industry || ""} ${enriched.what_they_do || ""} ${enriched.company_name || ""}`.toLowerCase();
  for (const line of String(rulesText || "").split(/\n|;/)) {
    const [keyword, owner] = line.split("=").map((x) => (x || "").trim());
    if (keyword && owner && haystack.includes(keyword.toLowerCase())) return owner;
  }
  return defaultOwner;
}

/** Reviews not seen before (by review name/id). store is the workflow's static data. */
export function newReviews(reviews, store) {
  store.seen = store.seen || {};
  const fresh = [];
  for (const r of reviews || []) {
    const id = r.name || `${r.authorAttribution && r.authorAttribution.displayName}|${r.publishTime}`;
    if (store.seen[id]) continue;
    store.seen[id] = r.publishTime || true;
    fresh.push({
      review_id: id, rating: Number(r.rating) || 0, author: (r.authorAttribution && r.authorAttribution.displayName) || "",
      text: String((r.originalText && r.originalText.text) || (r.text && r.text.text) || "").slice(0, 3000),
      published_at: r.publishTime || "", when: r.relativePublishTimeDescription || "",
    });
  }
  return fresh;
}

/** OpenAI request that analyses one review and drafts a public reply. */
export function buildReviewRequest(review, s) {
  const system = [
    `You manage online reviews for ${s.businessName}. Tone for replies: ${s.replyTone}.`,
    "Draft a short public reply in the reviewer's language: thank them, address specific points, never argue, never offer compensation or admit legal fault, invite unhappy customers to contact " + s.contactEmail + ".",
    'Answer with JSON only: {"sentiment":"positive|neutral|negative","summary":"one line","topics":["..."],"reply":"..."}',
  ].join("\n");
  return {
    model: s.openAiModel, temperature: 0.4, response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify({ rating: review.rating, author: review.author, text: review.text }) }],
  };
}

/** OpenAI request that triages a support ticket. */
export function buildTicketRequest(ticket, s) {
  const system = [
    `You triage customer support emails for ${s.businessName}. ${s.businessDescription}`,
    `Categories: ${s.categories}. Urgency: urgent (service down, payment problem, angry customer, legal), high, normal, low.`,
    `Suggest a reply in the customer's language, signed "${s.senderName}", using only these policies: ${s.policies}. If unsure, say the team is looking into it.`,
    'Answer with JSON only: {"category":"...","urgency":"urgent|high|normal|low","sentiment":"positive|neutral|negative","language":"en","summary":"one line","suggested_reply":"plain text"}',
  ].join("\n");
  return {
    model: s.openAiModel, temperature: 0.2, response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify({ from: ticket.name || ticket.email, subject: ticket.subject, message: ticket.message }) }],
  };
}

/** Line items from a Shopify or WooCommerce order. */
export function orderLines(order) {
  return (order.line_items || []).map((l) => ({ sku: String(l.sku || "").trim(), name: l.title || l.name || "", qty: Number(l.quantity) || 0 })).filter((l) => l.qty > 0);
}

/** Order summary for the log, from Shopify or WooCommerce. */
export function orderSummary(order, source) {
  const lines = orderLines(order);
  return {
    order_id: String(order.name || order.number || order.id || ""), source,
    created_at: order.created_at || order.date_created_gmt || order.date_created || new Date().toISOString(),
    customer_email: order.email || (order.billing && order.billing.email) || "",
    total: order.total_price || order.total || "", currency: order.currency || "",
    items: lines.map((l) => `${l.qty} x ${l.sku || l.name}`).join(", "),
  };
}

/** New stock levels after an order, plus SKUs that hit their low-stock threshold and SKUs not in the sheet. */
export function applyOrder(inventory, lines, nowIso) {
  const bySku = new Map(inventory.filter((r) => r.sku).map((r) => [String(r.sku).trim(), r]));
  const updates = new Map();
  const unknown = [];
  for (const l of lines) {
    const row = bySku.get(l.sku);
    if (!l.sku || !row) { unknown.push(l.sku || l.name); continue; }
    const current = updates.has(l.sku) ? updates.get(l.sku).stock : Number(row.stock) || 0;
    updates.set(l.sku, { sku: l.sku, stock: current - l.qty, last_order_at: nowIso, product: row.product, threshold: Number(row.low_stock_threshold) || 0 });
  }
  const rows = [...updates.values()];
  return {
    updates: rows.map(({ sku, stock, last_order_at }) => ({ sku, stock, last_order_at })),
    low: rows.filter((r) => r.stock <= r.threshold).map((r) => ({ sku: r.sku, product: r.product, stock: r.stock, threshold: r.threshold })),
    unknown,
  };
}

/** A Shopify checkout as a cart row. */
export function checkoutRow(c) {
  const items = (c.line_items || []).map((l) => `${l.quantity} x ${l.title}`).join(", ");
  return {
    checkout_id: String(c.token || c.id || ""), email: c.email || (c.customer && c.customer.email) || "",
    first_name: (c.customer && c.customer.first_name) || (c.billing_address && c.billing_address.first_name) || "",
    items, total: c.total_price || "", currency: c.currency || c.presentment_currency || "",
    recovery_url: c.abandoned_checkout_url || "", created_at: c.created_at || new Date().toISOString(),
  };
}

/** Open carts due a reminder: first after firstDelayHours, then every repeatHours, up to max. */
export function dueCartReminders(rows, nowIso, firstDelayHours, repeatHours, max) {
  const now = Date.parse(nowIso);
  return rows.filter((r) => {
    // Rows saved from Shopify have no status until a reminder or an order changes it: empty means open.
    if (String(r.status || "open").toLowerCase() !== "open" || !r.email || !r.recovery_url) return false;
    const sent = Number(r.reminders || 0);
    if (sent >= max) return false;
    const since = sent === 0 ? Date.parse(r.created_at) : Date.parse(r.last_reminder_at);
    const wait = (sent === 0 ? firstDelayHours : repeatHours) * 3600000;
    return Number.isFinite(since) && now - since >= wait;
  });
}

/** OpenAI request for a cart reminder email. */
export function buildCartReminderRequest(cart, n, s) {
  const system = [
    `You write cart reminder emails for ${s.storeName}. Brand voice: ${s.brandVoice}. Language: ${s.language}.`,
    `This is reminder ${n}. Under 90 words. Mention the items. Friendly, no pressure, no false urgency, no made-up stock levels.`,
    s.discountCode && n >= 2 ? `Mention the discount code ${s.discountCode} (${s.discountText}).` : "Do not mention any discount.",
    'Answer with JSON only: {"subject":"...","body":"plain text, without the link (it is added after)"}',
  ].join("\n");
  return {
    model: s.openAiModel, temperature: 0.6, response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify({ first_name: cart.first_name, items: cart.items, total: `${cart.total} ${cart.currency}` }) }],
  };
}

/** A meeting from the form or a webhook. */
export function normalizeMeeting(input) {
  const b = input.body || input;
  const pick = (...keys) => { for (const k of keys) if (b[k] != null && String(b[k]).trim()) return String(b[k]).trim(); return ""; };
  const attendees = (Array.isArray(b.attendees) ? b.attendees.join(",") : pick("attendees", "Attendees (emails, comma separated)", "Attendees"))
    .split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  return {
    title: pick("title", "Meeting title", "meeting_title") || "Meeting",
    date: pick("date", "Meeting date", "meeting_date") || new Date().toISOString().slice(0, 10),
    attendees: [...new Set(attendees)],
    transcript: pick("transcript", "Transcript or notes", "notes", "text").slice(0, 60000),
  };
}

/** OpenAI request that summarizes a meeting and extracts action items. */
export function buildMeetingRequest(meeting, s) {
  const system = [
    `You write meeting notes for ${s.teamName}. Language: same as the transcript.`,
    "Be factual: only what was said. Action items need a clear task; owner is a person's name or email when stated, else empty; due_date as YYYY-MM-DD only when a date was stated.",
    'Answer with JSON only: {"summary":"3-6 sentences","decisions":["..."],"action_items":[{"task":"","owner":"","due_date":""}],"open_questions":["..."]}',
  ].join("\n");
  return {
    model: s.openAiModel, temperature: 0.2, response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: `Meeting: ${meeting.title} (${meeting.date})\nAttendees: ${meeting.attendees.join(", ")}\n\nTranscript:\n${meeting.transcript}` }],
  };
}

/** Meeting notes as a plain-text email body. */
export function meetingEmail(meeting, notes) {
  const list = (items) => (items && items.length ? items.map((x) => `- ${x}`).join("\n") : "- none");
  const actions = (notes.action_items || []).map((a) => `- ${a.task}${a.owner ? ` (${a.owner})` : ""}${a.due_date ? `, due ${a.due_date}` : ""}`).join("\n") || "- none";
  return `${meeting.title} (${meeting.date})\n\nSummary\n${notes.summary || ""}\n\nDecisions\n${list(notes.decisions)}\n\nAction items\n${actions}\n\nOpen questions\n${list(notes.open_questions)}`;
}

/** Sites to check, one per line: "https://example.com" or "https://example.com | text that must appear". */
export function parseSites(text) {
  return String(text || "").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => {
    const [url, keyword] = l.split("|").map((x) => x.trim());
    return { url, keyword: keyword || "" };
  }).filter((s) => /^https?:\/\//i.test(s.url));
}

/** Up or down for one check. response: the HTTP node output (full response) or an error passthrough. */
export function siteStatus(site, response) {
  const code = Number(response && response.statusCode);
  if (!code) return { ...site, up: false, detail: (response && (response.error && (response.error.message || response.error))) || "no response (timeout or connection error)" };
  if (code >= 400) return { ...site, up: false, detail: `HTTP ${code}` };
  if (site.keyword && !String(response.body || "").includes(site.keyword)) return { ...site, up: false, detail: `HTTP ${code} but "${site.keyword}" not found` };
  return { ...site, up: true, detail: `HTTP ${code}` };
}

/** Down and recovery events. A site is down after `confirm` failed checks in a row. store is static data. */
export function uptimeEvents(results, store, nowIso, confirm) {
  store.sites = store.sites || {};
  const events = [];
  for (const r of results) {
    const st = store.sites[r.url] || { down: false, fails: 0, since: "" };
    if (!r.up) {
      st.fails += 1;
      if (!st.down && st.fails >= confirm) {
        st.down = true; st.since = nowIso;
        events.push({ url: r.url, event: "down", at: nowIso, detail: r.detail, duration_minutes: "" });
      }
    } else {
      if (st.down) {
        const minutes = Math.round((Date.parse(nowIso) - Date.parse(st.since)) / 60000);
        events.push({ url: r.url, event: "recovered", at: nowIso, detail: r.detail, duration_minutes: minutes });
      }
      st.down = false; st.fails = 0; st.since = "";
    }
    store.sites[r.url] = st;
  }
  return events;
}
