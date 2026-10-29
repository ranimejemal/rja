import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, afterEach } from "vitest";
import { DateTime, Settings } from "luxon";
import * as L from "../automations/src/logic.mjs";
import { scanWorkflow } from "../lib/workflow-scan";

const NOW = "2026-03-10T09:00:00.000Z";

describe("lead logic", () => {
  it("normalizes form, webhook and Facebook Lead Ads shapes", () => {
    const form = L.normalizeLead({ Name: "Ana", Email: "ANA@Shop.com ", Message: "Need leads" }, "form", NOW);
    expect(form).toMatchObject({ name: "Ana", email: "ana@shop.com", message: "Need leads", valid: true, source: "form" });
    const hook = L.normalizeLead({ body: { first_name: "Jo", last_name: "Lee", email_address: "jo@x.io", phone_number: "+33 6" } }, "webhook", NOW);
    expect(hook).toMatchObject({ name: "Jo Lee", email: "jo@x.io", phone: "+33 6" });
    const fb = L.normalizeLead({ id: "1", data: { full_name: "Sam", email: "sam@x.fr" }, form: { id: "f" } }, "facebook", NOW);
    expect(fb).toMatchObject({ name: "Sam", email: "sam@x.fr", valid: true });
    expect(L.normalizeLead({ name: "No mail" }, "form", NOW)).toMatchObject({ valid: false, problem: "missing or invalid email" });
  });

  it("finds leads due a follow-up", () => {
    const rows = [
      { email: "a@x.io", status: "contacted", follow_ups: 0, last_contact_at: "2026-03-07T09:00:00Z" },
      { email: "b@x.io", status: "contacted", follow_ups: 0, last_contact_at: "2026-03-09T09:00:00Z" },
      { email: "c@x.io", status: "replied", follow_ups: 0, last_contact_at: "2026-03-01T09:00:00Z" },
      { email: "d@x.io", status: "contacted", follow_ups: 3, last_contact_at: "2026-03-01T09:00:00Z" },
    ];
    expect(L.dueFollowUps(rows, NOW, 2, 3).map((r: { email: string }) => r.email)).toEqual(["a@x.io"]);
  });

  it("reads OpenAI JSON answers and fails clearly", () => {
    expect(L.readAiJson({ choices: [{ message: { content: '{"score":"hot"}' } }] })).toEqual({ score: "hot" });
    expect(() => L.readAiJson({ choices: [{ message: { content: "nope" } }] })).toThrow(/not valid JSON/);
    expect(() => L.readAiJson({})).toThrow(/no answer/);
  });

  it("extracts email addresses from headers", () => {
    expect(L.emailAddress("Jane Doe <Jane@Example.com>")).toBe("jane@example.com");
    expect(L.emailAddress("bob@x.io")).toBe("bob@x.io");
  });
});

describe("booking logic", () => {
  afterEach(() => { Settings.now = () => Date.now(); });

  it("picks events starting in the reminder window", () => {
    const events = [
      { id: "1", start: { dateTime: "2026-03-11T09:30:00Z" }, attendees: [{ email: "c@x.io" }] },
      { id: "2", start: { dateTime: "2026-03-11T11:00:00Z" }, attendees: [{ email: "d@x.io" }] },
      { id: "3", start: { dateTime: "2026-03-11T09:10:00Z" }, description: "Client email: e@x.io" },
      { id: "4", start: { dateTime: "2026-03-11T09:20:00Z" } },
    ];
    expect(L.dueReminders(events, NOW, 24).map((r: { email: string }) => r.email)).toEqual(["c@x.io", "e@x.io"]);
  });

  it("lists free slots around busy events in the business time zone", () => {
    Settings.now = () => Date.parse("2026-03-09T08:00:00Z");
    const s = { timezone: "Europe/Paris", openDays: "1,2,3,4,5", openTime: "09:00", closeTime: "12:00", slotMinutes: 60 };
    const busy = [{ start: { dateTime: "2026-03-10T10:00:00+01:00" }, end: { dateTime: "2026-03-10T11:00:00+01:00" } }];
    expect(L.freeSlots(DateTime, busy, "2026-03-10", s).slots).toEqual(["09:00", "11:00"]);
    expect(L.freeSlots(DateTime, [], "2026-03-15", s).note).toMatch(/closed/);
    const booking = L.bookingTimes(DateTime, { date: "2026-03-10", time: "09:00" }, s);
    expect(booking).toMatchObject({ ok: true, start: "2026-03-10T09:00:00.000+01:00", end: "2026-03-10T10:00:00.000+01:00" });
    expect(L.bookingTimes(DateTime, { date: "2026-03-01", time: "09:00" }, s)).toMatchObject({ ok: false });
  });

  it("parses Vapi tool calls with string or object arguments", () => {
    const body = { message: { type: "tool-calls", call: { customer: { number: "+331" } }, toolCallList: [
      { id: "t1", type: "function", function: { name: "check_availability", arguments: { date: "2026-03-10" } } },
      { id: "t2", type: "function", function: { name: "take_message", arguments: '{"message":"hi"}' } },
    ] } };
    expect(L.parseVapiToolCalls(body)).toEqual([
      { toolCallId: "t1", name: "check_availability", args: { date: "2026-03-10" }, caller_number: "+331" },
      { toolCallId: "t2", name: "take_message", args: { message: "hi" }, caller_number: "+331" },
    ]);
  });
});

describe("social media logic", () => {
  const rows = [
    { topic: "Spring offer", status: "idea", publish_at: "2026-03-12T10:00:00Z" },
    { topic: "Far away", status: "idea", publish_at: "2026-04-30T10:00:00Z" },
    { topic: "Ready", status: "approved", publish_at: "2026-03-10T08:00:00Z" },
    { topic: "Later", status: "approved", publish_at: "2026-03-10T12:00:00Z" },
  ];
  it("selects ideas to draft and approved posts to publish", () => {
    expect(L.contentToDraft(rows, NOW, 7).map((r: { topic: string }) => r.topic)).toEqual(["Spring offer"]);
    expect(L.duePosts(rows, NOW).map((r: { topic: string }) => r.topic)).toEqual(["Ready"]);
  });
  it("summarizes publishing results", () => {
    expect(L.publishOutcome([{ network: "facebook", enabled: true }, { network: "x", enabled: false }])).toMatchObject({ status: "published", published_to: "facebook" });
    expect(L.publishOutcome([{ network: "facebook", enabled: true }, { network: "instagram", enabled: true, error: "bad image" }]).status).toBe("partly published");
  });
});

describe("document logic", () => {
  it("builds file and image parts", () => {
    expect(L.documentPart("application/pdf", "AAA", "a.pdf")).toEqual({ type: "file", file: { filename: "a.pdf", file_data: "data:application/pdf;base64,AAA" } });
    expect(L.documentPart("image/jpeg", "BBB", "r.jpg")).toEqual({ type: "image_url", image_url: { url: "data:image/jpeg;base64,BBB" } });
    expect(L.documentPart("application/zip", "C", "x.zip")).toBeNull();
  });
  it("flags documents that need review", () => {
    const good = { supplier_name: "Acme", invoice_date: "2026-03-01", currency: "EUR", subtotal: 100, vat_amount: 20, total: 120, line_items: [{ amount: 100 }], confidence: "high" };
    expect(L.checkExtraction(good)).toEqual({ status: "ok", issues: "" });
    expect(L.checkExtraction({ ...good, total: 130 }).issues).toMatch(/does not match total/);
    expect(L.checkExtraction({ ...good, supplier_name: "" }).status).toBe("needs review");
  });
  it("names files consistently", () => {
    expect(L.documentFileName({ invoice_date: "2026-03-01", supplier_name: "Acme Ltd.", invoice_number: "INV/001" }, "scan.PDF")).toBe("2026-03-01_Acme-Ltd._INV-001.pdf");
    expect(L.documentFileName({}, "x.jpg")).toBe("undated_unknown-supplier_no-number.jpg");
  });
});

describe("security logic", () => {
  it("normalizes Wazuh, Alertmanager, GuardDuty via SNS and generic alerts", () => {
    const wazuh = L.normalizeAlerts({ rule: { level: 12, description: "SSH brute force", id: "5712" }, agent: { name: "web-1" }, data: { srcip: "203.0.113.9" } }, NOW);
    expect(wazuh[0]).toMatchObject({ source: "wazuh", severity: "critical", host: "web-1", ip: "203.0.113.9" });
    const am = L.normalizeAlerts({ alerts: [{ status: "firing", labels: { alertname: "HighCPU", severity: "warning", instance: "10.0.0.5:9100" } }, { status: "resolved", labels: {} }] }, NOW);
    expect(am).toHaveLength(1);
    expect(am[0]).toMatchObject({ severity: "medium", ip: "10.0.0.5" });
    const gd = L.normalizeAlerts({ Type: "Notification", Message: JSON.stringify({ "detail-type": "GuardDuty Finding", detail: { type: "Recon:EC2/PortProbe", title: "Port probe", severity: 8, resource: { instanceDetails: { instanceId: "i-1" } } } }) }, NOW);
    expect(gd[0]).toMatchObject({ source: "guardduty", severity: "high", host: "i-1" });
    expect(L.normalizeAlerts({ title: "Login failed", severity: "high", host: "vpn" }, NOW)[0]).toMatchObject({ source: "webhook", severity: "high" });
  });
  it("suppresses repeats within the window", () => {
    const store: Record<string, unknown> = {};
    const a = L.normalizeAlerts({ title: "x", host: "h" }, NOW);
    expect(L.dedupeAlerts(a, store, 0, 30)).toHaveLength(1);
    expect(L.dedupeAlerts(a, store, 10 * 60000, 30)).toHaveLength(0);
    expect(L.dedupeAlerts(a, store, 45 * 60000, 30)).toHaveLength(1);
  });
  it("summarizes VirusTotal and weekly stats", () => {
    expect(L.ipReputation({ data: { attributes: { last_analysis_stats: { malicious: 3 }, country: "NL" } } })).toMatchObject({ malicious: 3, country: "NL" });
    expect(L.ipReputation(null)).toBeNull();
    const stats = L.weeklyStats([
      { received_at: "2026-03-09T00:00:00Z", severity: "high", host: "a", title: "t", status: "open" },
      { received_at: "2026-02-01T00:00:00Z", severity: "low", host: "b", title: "u" },
    ], NOW);
    expect(stats).toMatchObject({ total: 1, by_severity: { high: 1 } });
    expect(stats.open_critical).toHaveLength(1);
  });
});

describe("catalog automation logic", () => {
  it("reads an email enquiry without quoted history", () => {
    const e = L.emailEnquiry({ id: "m1", threadId: "t1", subject: "Quote", from: { value: [{ address: "Ana@Shop.com", name: "Ana" }] },
      text: "Hello, we need a quote.\n\nOn Mon, 1 Jan 2026 at 10:00 Bob <b@x.io> wrote:\n> old stuff", date: "2026-03-10T09:00:00Z" });
    expect(e).toMatchObject({ email: "ana@shop.com", name: "Ana", thread_id: "t1", message: "Hello, we need a quote." });
  });

  it("finds the company domain unless it is free mail", () => {
    expect(L.companyDomain("jo@acme.io", "")).toBe("acme.io");
    expect(L.companyDomain("jo@gmail.com", "")).toBe("");
    expect(L.companyDomain("jo@gmail.com", "https://www.Acme.com/about")).toBe("acme.com");
  });

  it("strips HTML to visible text", () => {
    expect(L.htmlToText("<html><style>x{}</style><script>bad()</script><h1>Acme &amp; Co</h1><p>We  build\nrobots</p></html>")).toBe("Acme & Co We build robots");
  });

  it("routes leads by keyword rules", () => {
    const rules = "real estate = anna@x.io\nretail = tom@x.io";
    expect(L.routeLead({ industry: "Real Estate agency" }, rules, "sales@x.io")).toBe("anna@x.io");
    expect(L.routeLead({ industry: "Banking" }, rules, "sales@x.io")).toBe("sales@x.io");
  });

  it("returns only unseen reviews", () => {
    const store: Record<string, unknown> = {};
    const reviews = [{ name: "r1", rating: 2, text: { text: "Slow" }, authorAttribution: { displayName: "Ann" }, publishTime: "2026-03-01T00:00:00Z" }];
    expect(L.newReviews(reviews, store)).toEqual([expect.objectContaining({ review_id: "r1", rating: 2, author: "Ann", text: "Slow" })]);
    expect(L.newReviews(reviews, store)).toEqual([]);
  });

  it("applies an order to stock and flags low stock and unknown SKUs", () => {
    const inventory = [{ sku: "A1", product: "Mug", stock: 10, low_stock_threshold: 5 }, { sku: "B2", product: "Tee", stock: 50, low_stock_threshold: 5 }];
    const lines = L.orderLines({ line_items: [{ sku: "A1", quantity: 3, title: "Mug" }, { sku: "A1", quantity: 2 }, { sku: "Z9", quantity: 1, title: "Gift" }] });
    const r = L.applyOrder(inventory, lines, NOW);
    expect(r.updates).toEqual([{ sku: "A1", stock: 5, last_order_at: NOW }]);
    expect(r.low).toEqual([{ sku: "A1", product: "Mug", stock: 5, threshold: 5 }]);
    expect(r.unknown).toEqual(["Z9"]);
    expect(L.orderSummary({ number: "1001", billing: { email: "c@x.io" }, total: "12.00", currency: "EUR", line_items: [{ sku: "A1", quantity: 1 }] }, "woocommerce"))
      .toMatchObject({ order_id: "1001", customer_email: "c@x.io", items: "1 x A1" });
  });

  it("schedules cart reminders", () => {
    const base = { status: "open", email: "c@x.io", recovery_url: "https://shop/r", created_at: "2026-03-10T07:30:00Z", reminders: 0, last_reminder_at: "" };
    expect(L.dueCartReminders([base], NOW, 1, 24, 3)).toHaveLength(1);
    expect(L.dueCartReminders([{ ...base, created_at: "2026-03-10T08:30:00Z" }], NOW, 1, 24, 3)).toHaveLength(0);
    expect(L.dueCartReminders([{ ...base, reminders: 1, last_reminder_at: "2026-03-09T08:00:00Z" }], NOW, 1, 24, 3)).toHaveLength(1);
    expect(L.dueCartReminders([{ ...base, status: "recovered" }], NOW, 1, 24, 3)).toHaveLength(0);
    expect(L.dueCartReminders([{ ...base, status: "", reminders: "" }], NOW, 1, 24, 3)).toHaveLength(1);
    expect(L.checkoutRow({ token: "tok", email: "c@x.io", line_items: [{ quantity: 2, title: "Mug" }], total_price: "20.00", currency: "EUR", abandoned_checkout_url: "https://shop/r" }))
      .toMatchObject({ checkout_id: "tok", items: "2 x Mug" });
  });

  it("normalizes meetings and formats notes", () => {
    const m = L.normalizeMeeting({ "Meeting title": "Kickoff", "Attendees (emails, comma separated)": "a@x.io, B@x.io; bad", "Transcript or notes": "We agreed..." });
    expect(m).toMatchObject({ title: "Kickoff", attendees: ["a@x.io", "b@x.io"], transcript: "We agreed..." });
    const text = L.meetingEmail(m, { summary: "S", decisions: ["Go"], action_items: [{ task: "Send quote", owner: "Ana", due_date: "2026-03-12" }], open_questions: [] });
    expect(text).toContain("- Send quote (Ana), due 2026-03-12");
    expect(text).toContain("Open questions\n- none");
  });

  it("detects downtime after confirmed failures and reports recovery", () => {
    expect(L.parseSites("https://a.com\n# comment\nhttps://b.com | Welcome\nnot a url")).toEqual([{ url: "https://a.com", keyword: "" }, { url: "https://b.com", keyword: "Welcome" }]);
    expect(L.siteStatus({ url: "u", keyword: "Welcome" }, { statusCode: 200, body: "<h1>Welcome</h1>" }).up).toBe(true);
    expect(L.siteStatus({ url: "u", keyword: "Welcome" }, { statusCode: 200, body: "Maintenance" }).detail).toMatch(/not found/);
    expect(L.siteStatus({ url: "u" }, { statusCode: 503 }).up).toBe(false);
    expect(L.siteStatus({ url: "u" }, { url: "u" }).detail).toMatch(/no response/);
    const store: Record<string, unknown> = {};
    const down = { url: "u", up: false, detail: "HTTP 503" };
    expect(L.uptimeEvents([down], store, "2026-03-10T09:00:00Z", 2)).toEqual([]);
    expect(L.uptimeEvents([down], store, "2026-03-10T09:05:00Z", 2)).toEqual([expect.objectContaining({ event: "down" })]);
    expect(L.uptimeEvents([down], store, "2026-03-10T09:10:00Z", 2)).toEqual([]);
    expect(L.uptimeEvents([{ url: "u", up: true, detail: "HTTP 200" }], store, "2026-03-10T09:35:00Z", 2)).toEqual([expect.objectContaining({ event: "recovered", duration_minutes: 30 })]);
  });

  it("filters due posts by status", () => {
    expect(L.duePosts([{ status: "scheduled", publish_at: "2026-03-10T08:00:00Z" }], NOW, "scheduled")).toHaveLength(1);
  });
});

// The generated workflows: each one must pass the marketplace upload scan and reference only existing nodes.
const dir = join(__dirname, "..", "automations");
const workflows = existsSync(dir)
  ? readdirSync(dir).filter((d) => existsSync(join(dir, d, "workflow.json"))).map((d) => ({ name: d, raw: readFileSync(join(dir, d, "workflow.json"), "utf8") }))
  : [];

describe("workflow files", () => {
  it("all workflows are present", () => expect(workflows.length).toBeGreaterThanOrEqual(17));
  it.each(workflows)("$name passes the marketplace upload scan", ({ raw }) => {
    const report = scanWorkflow(raw);
    expect(report.findings.filter((f) => f.severity === "error")).toEqual([]);
  });
  it.each(workflows)("$name connections point at existing nodes", ({ raw }) => {
    const wf = JSON.parse(raw) as { nodes: { name: string }[]; connections: Record<string, Record<string, { node: string }[][]>> };
    const names = new Set(wf.nodes.map((n) => n.name));
    expect(names.size).toBe(wf.nodes.length);
    for (const [from, outputs] of Object.entries(wf.connections)) {
      expect(names.has(from)).toBe(true);
      for (const list of Object.values(outputs)) for (const branch of list) for (const c of branch) expect(names.has(c.node)).toBe(true);
    }
  });
});

vi.useRealTimers();
