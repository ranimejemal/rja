// Generates the n8n workflow files in automations/*/workflow.json.
// Run with: node automations/src/build.mjs
// Code-node logic lives in logic.mjs (unit-tested) and is copied into the nodes here.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as L from "./logic.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OPENAI_URL = "={{ $('Settings').first().json.openAiBaseUrl }}/chat/completions";

let idCounter = 0;
const uid = (prefix) => `${prefix}-${(++idCounter).toString(16).padStart(4, "0")}`;

class Workflow {
  constructor(name) {
    this.name = name;
    this.nodes = [];
    this.connections = {};
  }
  add(name, type, typeVersion, parameters, position, extra = {}) {
    this.nodes.push({ parameters, id: uid("node"), name, type, typeVersion, position, ...extra });
    return name;
  }
  connect(from, to, { output = 0, input = 0, type = "main" } = {}) {
    const outs = (this.connections[from] ??= {});
    const list = (outs[type] ??= []);
    while (list.length <= output) list.push([]);
    list[output].push({ node: to, type, index: input });
  }
  chain(...names) {
    for (let i = 0; i < names.length - 1; i++) this.connect(names[i], names[i + 1]);
  }
  note(content, position, width = 420, height = 260, color = 4) {
    this.add(`Note ${this.nodes.filter((n) => n.type === "n8n-nodes-base.stickyNote").length + 1}`, "n8n-nodes-base.stickyNote", 1,
      { content, height, width, color }, position);
  }
  toJSON() {
    return {
      name: this.name,
      nodes: this.nodes,
      connections: this.connections,
      settings: { executionOrder: "v1", saveManualExecutions: true, callerPolicy: "workflowsFromSameOwner" },
      pinData: {},
      meta: { templateCredsSetupCompleted: false },
      tags: [],
    };
  }
}

// ---------------------------------------------------------------------------------------------- node helpers

/** Settings node: one place for the values a client changes. Keeps the trigger's data and files. */
function settings(wf, fields, position) {
  return wf.add("Settings", "n8n-nodes-base.set", 3.4, {
    mode: "manual",
    assignments: {
      assignments: fields.map(([name, value, type = "string"]) => ({ id: uid("set"), name, value, type })),
    },
    includeOtherFields: true,
    options: {},
  }, position, { notes: "Fill in these values before activating.", color: "#FFD233" });
}

/** Switch that routes by which trigger started the execution. */
function route(wf, outputs, position) {
  return wf.add("Route", "n8n-nodes-base.switch", 3.2, {
    rules: {
      values: outputs.map(([label, triggers]) => ({
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
          conditions: [{
            id: uid("cond"),
            leftValue: `={{ ${triggers.map((t) => `$('${t}').isExecuted`).join(" || ")} }}`,
            rightValue: "",
            operator: { type: "boolean", operation: "true", singleValue: true },
          }],
          combinator: "and",
        },
        renameOutput: true,
        outputKey: label,
      })),
    },
    options: {},
  }, position);
}

function code(wf, name, fns, body, position, extra = {}) {
  const jsCode = [...fns.map((f) => f.toString()), body.trim()].join("\n\n");
  return wf.add(name, "n8n-nodes-base.code", 2, { jsCode }, position, extra);
}

function codeEach(wf, name, fns, body, position, extra = {}) {
  const jsCode = [...fns.map((f) => f.toString()), body.trim()].join("\n\n");
  return wf.add(name, "n8n-nodes-base.code", 2, { mode: "runOnceForEachItem", jsCode }, position, extra);
}

/** OpenAI chat completion; the incoming item carries the request body in json.request. */
function openAi(wf, name, position) {
  return wf.add(name, "n8n-nodes-base.httpRequest", 4.2, {
    method: "POST",
    url: OPENAI_URL,
    authentication: "predefinedCredentialType",
    nodeCredentialType: "openAiApi",
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={{ JSON.stringify($json.request) }}",
    options: { timeout: 120000 },
  }, position, { retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 });
}

function condition(leftValue, operation, rightValue = "", type = "string") {
  const single = ["true", "false", "exists", "notExists", "empty", "notEmpty"].includes(operation);
  return {
    options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
    conditions: [{
      id: uid("cond"), leftValue, rightValue,
      operator: { type, operation, ...(single ? { singleValue: true } : {}) },
    }],
    combinator: "and",
  };
}

function ifNode(wf, name, cond, position) {
  return wf.add(name, "n8n-nodes-base.if", 2.2, { conditions: cond, looseTypeValidation: true, options: {} }, position);
}

const sheetDoc = { __rl: true, mode: "url", value: "={{ $('Settings').first().json.googleSheetUrl }}" };
const sheetTab = (tab) => ({ __rl: true, mode: "name", value: tab });

function sheetsRead(wf, name, tab, position, extra = {}) {
  return wf.add(name, "n8n-nodes-base.googleSheets", 4.5, {
    documentId: sheetDoc, sheetName: sheetTab(tab), options: {},
  }, position, { alwaysOutputData: true, ...extra });
}

function sheetsAppend(wf, name, tab, position, extra = {}) {
  return wf.add(name, "n8n-nodes-base.googleSheets", 4.5, {
    operation: "append", documentId: sheetDoc, sheetName: sheetTab(tab),
    columns: { mappingMode: "autoMapInputData", value: {}, matchingColumns: [], schema: [] },
    options: { handlingExtraData: "ignoreIt" },
  }, position, extra);
}

function sheetsUpdate(wf, name, tab, key, position, extra = {}) {
  return wf.add(name, "n8n-nodes-base.googleSheets", 4.5, {
    operation: "update", documentId: sheetDoc, sheetName: sheetTab(tab),
    columns: { mappingMode: "autoMapInputData", value: {}, matchingColumns: [key], schema: [] },
    options: { handlingExtraData: "ignoreIt" },
  }, position, extra);
}

function gmailSend(wf, name, { to, subject, message, html = false }, position, extra = {}) {
  return wf.add(name, "n8n-nodes-base.gmail", 2.1, {
    sendTo: to, subject, emailType: html ? "html" : "text", message,
    options: { appendAttribution: false, senderName: "={{ $('Settings').first().json.senderName }}" },
  }, position, extra);
}

function gmailDraft(wf, name, { to, subject, message }, position) {
  return wf.add(name, "n8n-nodes-base.gmail", 2.1, {
    resource: "draft", subject, emailType: "text", message, options: { sendTo: to },
  }, position);
}

function schedule(wf, name, cron, position) {
  return wf.add(name, "n8n-nodes-base.scheduleTrigger", 1.2, {
    rule: { interval: [{ field: "cronExpression", expression: cron }] },
  }, position);
}

function webhook(wf, name, path, position, { respond = "onReceived", headerAuth = false } = {}) {
  return wf.add(name, "n8n-nodes-base.webhook", 2, {
    httpMethod: "POST", path, ...(headerAuth ? { authentication: "headerAuth" } : {}),
    responseMode: respond, options: {},
  }, position, { webhookId: uid("hook") });
}

const S = "$('Settings').first().json";
const COMMON_AI = [
  ["openAiModel", "gpt-4.1-mini"],
  ["openAiBaseUrl", "https://api.openai.com/v1"],
];

function save(dir, wf) {
  const file = join(ROOT, dir, "workflow.json");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(wf.toJSON(), null, 2) + "\n");
  console.log("wrote", file);
}

const PREPARE_EXTRACTION_JS = `
const s = ${S};
const items = $input.all();
for (let i = 0; i < items.length; i++) {
  const buffer = await this.helpers.getBinaryDataBuffer(i, 'data');
  const part = documentPart(items[i].json.mime_type, buffer.toString('base64'), items[i].json.file_name);
  items[i].json.request = buildExtractRequest(part, s);
  items[i].pairedItem = { item: i };
}
return items;`;

const CHECK_DATA_JS = `
const prepared = $('Prepare extraction').all();
return $input.all().map((item, i) => {
  const src = prepared[i];
  let x;
  try { x = readAiJson(item.json); } catch (e) { x = { confidence: 'low', error: e.message }; }
  const check = checkExtraction(x);
  return {
    json: {
      processed_at: new Date().toISOString(), source: src.json.source, received_from: src.json.received_from, original_file: src.json.file_name,
      document_type: x.document_type || '', supplier_name: x.supplier_name || '', supplier_vat_id: x.supplier_vat_id || '',
      invoice_number: x.invoice_number || '', invoice_date: x.invoice_date || '', due_date: x.due_date || '', currency: x.currency || '',
      subtotal: x.subtotal ?? '', vat_amount: x.vat_amount ?? '', total: x.total ?? '',
      line_items: JSON.stringify(x.line_items || []), status: check.status, issues: check.issues,
      drive_name: documentFileName(x, src.json.file_name),
    },
    binary: src.binary,
    pairedItem: { item: i },
  };
});`;

/** Publishes the next due post from a sheet to Facebook, Instagram, LinkedIn (and X when enabled), then records
 * the result per network. Shared by the social media automation and the content scheduler. */
function publishBranch(wf, readNode, { status, tab, y }) {
  const duePosts = code(wf, "Posts due now", [L.duePosts], `
const input = $input.all();
const index = new Map(input.map((it, i) => [it.json, i]));
const rows = input.map((i) => i.json).filter((r) => r.post_id);
// One post per run (the trigger runs hourly), so each result clearly belongs to one post.
return duePosts(rows, new Date().toISOString(), "${status}").slice(0, 1).map((row) => ({ json: row, pairedItem: { item: index.get(row) } }));`, [380, y]);
  wf.connect(readNode, duePosts);
  const post = "$('Posts due now').first().json";
  const fail = { onError: "continueErrorOutput" };
  const fbPost = wf.add("Post to Facebook", "n8n-nodes-base.facebookGraphApi", 1, {
    httpRequestMethod: "POST", graphApiVersion: "v22.0", node: `={{ ${S}.facebookPageId }}`, edge: "feed",
    options: { queryParameters: { parameter: [{ name: "message", value: `={{ ${post}.facebook }}\n\n{{ ${post}.hashtags }}` }] } },
  }, [600, y], fail);
  const igCreate = wf.add("Instagram: upload image", "n8n-nodes-base.facebookGraphApi", 1, {
    httpRequestMethod: "POST", graphApiVersion: "v22.0", node: `={{ ${S}.instagramAccountId }}`, edge: "media",
    options: { queryParameters: { parameter: [
      { name: "image_url", value: `={{ ${post}.image_url }}` },
      { name: "caption", value: `={{ ${post}.instagram }}\n\n{{ ${post}.hashtags }}` },
    ] } },
  }, [820, y], { ...fail, notes: "Instagram needs an image: put a public image URL in the image_url column." });
  const igPublish = wf.add("Instagram: publish", "n8n-nodes-base.facebookGraphApi", 1, {
    httpRequestMethod: "POST", graphApiVersion: "v22.0", node: `={{ ${S}.instagramAccountId }}`, edge: "media_publish",
    options: { queryParameters: { parameter: [{ name: "creation_id", value: "={{ $json.id }}" }] } },
  }, [1040, y - 60], fail);
  const li = wf.add("Post to LinkedIn", "n8n-nodes-base.linkedIn", 1, {
    postAs: "organization", organization: `={{ ${S}.linkedinOrganizationId }}`,
    text: `={{ ${post}.linkedin }}\n\n{{ ${post}.hashtags }}`, shareMediaCategory: "NONE", additionalFields: {},
  }, [1260, y], fail);
  const x = wf.add("Post to X", "n8n-nodes-base.twitter", 2, {
    text: `={{ ${post}.x }}`, additionalFields: {},
  }, [1480, y], { ...fail, disabled: true, notes: "Enable if you have X API access." });
  const outcome = code(wf, "Publishing result", [L.publishOutcome], `
// Each network node sends failures to its error output. A disabled node passes its input through unchanged,
// so a network only counts as published when its node returned a new response without an error.
const post = $('Posts due now').first();
const steps = [
  ['facebook', 'Post to Facebook'], ['instagram', 'Instagram: upload image'], ['instagram', 'Instagram: publish'],
  ['linkedin', 'Post to LinkedIn'], ['x', 'Post to X'],
];
const emitted = (node) => {
  try { if (!$(node).isExecuted) return null; } catch { return null; }
  let failed = [];
  try { failed = $(node).all(1); } catch { failed = []; }
  if (failed.length) return { json: failed[0].json, failed: true };
  const ok = $(node).all(0);
  return ok.length ? { json: ok[0].json, failed: false } : null;
};
const status = {};
let previous = JSON.stringify(post.json);
for (const [network, node] of steps) {
  const out = emitted(node);
  if (!out) { status[network] = status[network] || { network, enabled: false }; continue; }
  const now = JSON.stringify(out.json);
  const passedThrough = !out.failed && now === previous;
  previous = now;
  if (status[network] && status[network].error) continue;
  if (passedThrough) { status[network] = status[network] || { network, enabled: false }; continue; }
  const e = out.json.error;
  const message = out.failed ? (e && (e.message || e.description || e)) || 'failed' : out.json.statusCode ? out.json.message || 'HTTP ' + out.json.statusCode : '';
  status[network] = { network, enabled: true, error: message ? String(message).slice(0, 200) : '' };
}
return [{ json: { post_id: post.json.post_id, ...publishOutcome(Object.values(status)), published_at: new Date().toISOString() }, pairedItem: { item: 0 } }];`, [1700, y]);
  wf.connect(duePosts, fbPost);
  for (const [from, to] of [[fbPost, igCreate], [igPublish, li], [li, x], [x, outcome]]) {
    wf.connect(from, to, { output: 0 });
    wf.connect(from, to, { output: 1 });
  }
  wf.connect(igCreate, igPublish, { output: 0 });
  wf.connect(igCreate, li, { output: 1 });
  wf.connect(outcome, sheetsUpdate(wf, "Record publishing", tab, "post_id", [1920, y]));
}

// ======================================================================================== 1. lead generation
{
  const wf = new Workflow("AI Lead Generation & Follow-up | Ranime Jemal Agency");
  wf.note("## AI Lead Generation & Follow-up\n1. Fill in **Settings**.\n2. Make a Google Sheet with a **Leads** tab (columns in `leads-sheet.csv`).\n3. Connect Gmail, Google Sheets and OpenAI credentials.\n4. Optional: enable **Facebook Lead Ads** and pick your page and form.\n5. Activate. Share the form URL or post leads to the webhook.", [-560, -460], 520, 300);

  const form = wf.add("New lead form", "n8n-nodes-base.formTrigger", 2.2, {
    formTitle: "Tell us about your project",
    formDescription: "We reply within minutes.",
    formFields: { values: [
      { fieldLabel: "Name", requiredField: true },
      { fieldLabel: "Email", fieldType: "email", requiredField: true },
      { fieldLabel: "Phone" },
      { fieldLabel: "Company" },
      { fieldLabel: "How can we help?", fieldType: "textarea", requiredField: true },
      { fieldLabel: "Budget", fieldType: "dropdown", fieldOptions: { values: [{ option: "Not sure yet" }, { option: "Under $500" }, { option: "$500 - $2,000" }, { option: "$2,000 - $10,000" }, { option: "Over $10,000" }] } },
    ] },
    options: { appendAttribution: false, respondWithOptions: { values: { respondWith: "text", formSubmittedText: "Thank you! We will get back to you very soon." } } },
  }, [-560, -100], { webhookId: uid("hook") });
  const hook = webhook(wf, "Website or ads webhook", "new-lead", [-560, 80]);
  const fb = wf.add("Facebook Lead Ads", "n8n-nodes-base.facebookLeadAdsTrigger", 1, {
    page: { __rl: true, mode: "list", value: "" }, form: { __rl: true, mode: "list", value: "" }, options: {},
  }, [-560, 260], { disabled: true, webhookId: uid("hook"), notes: "Enable, then pick your Facebook page and lead form." });
  const daily = schedule(wf, "Every weekday at 9:00", "0 9 * * 1-5", [-560, 460]);
  const replied = wf.add("Lead replied by email", "n8n-nodes-base.gmailTrigger", 1.2, {
    pollTimes: { item: [{ mode: "everyX", value: 10, unit: "minutes" }] },
    simple: true,
    filters: { q: "in:inbox -from:me" },
    options: {},
  }, [-560, 660]);

  const set = settings(wf, [
    ["businessName", "Your business name"],
    ["businessDescription", "What you sell, in one or two sentences."],
    ["idealCustomer", "Who is a good fit: industry, size, need, budget."],
    ["senderName", "Your name, Your business"],
    ["bookingLink", "https://calendly.com/your-link"],
    ["teamEmail", "you@yourbusiness.com"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ["autoSendReplies", true, "boolean"],
    ["followUpDays", 2, "number"],
    ["maxFollowUps", 3, "number"],
    ...COMMON_AI,
  ], [-300, 280]);
  for (const t of [form, hook, fb, daily, replied]) wf.connect(t, set);
  const r = route(wf, [
    ["New lead", [form, hook, fb]],
    ["Follow-ups", [daily]],
    ["Reply", [replied]],
  ], [-80, 280]);
  wf.connect(set, r);

  // New lead
  const norm = code(wf, "Normalize lead", [L.normalizeLead, L.buildQualifyRequest], `
const s = ${S};
const source = $('New lead form').isExecuted ? 'website form' : $('Facebook Lead Ads').isExecuted ? 'facebook lead ads' : 'webhook';
const now = new Date().toISOString();
return $input.all().map((item, i) => {
  const lead = normalizeLead(item.json, source, now);
  return { json: { ...lead, request: buildQualifyRequest(lead, s) }, pairedItem: { item: i } };
});`, [160, 0]);
  wf.connect(r, norm, { output: 0 });
  const hasEmail = ifNode(wf, "Has an email?", condition("={{ $json.valid }}", "true", "", "boolean"), [380, 0]);
  wf.connect(norm, hasEmail);
  const qualify = openAi(wf, "Qualify lead with AI", [600, -100]);
  wf.connect(hasEmail, qualify, { output: 0 });
  const row = code(wf, "Lead row", [L.readAiJson], `
const leads = $('Normalize lead').all().filter((i) => i.json.valid);
const now = new Date().toISOString();
return $input.all().map((item, i) => {
  const lead = leads[i].json;
  const ai = readAiJson(item.json);
  return { json: {
    lead_id: lead.lead_id, received_at: lead.received_at, source: lead.source, name: lead.name, email: lead.email,
    phone: lead.phone, company: lead.company, message: lead.message, budget: lead.budget,
    score: ['hot', 'warm', 'cold'].includes(ai.score) ? ai.score : 'warm', reason: ai.reason || '', summary: ai.summary || '',
    status: 'contacted', follow_ups: 0, last_contact_at: now, replied_at: '',
    reply_subject: ai.subject || 'Thanks for getting in touch', reply_body: ai.reply || '',
  }, pairedItem: { item: i } };
});`, [820, -100]);
  wf.connect(qualify, row);
  const saveLead = sheetsAppend(wf, "Save lead", "Leads", [1040, -100]);
  wf.connect(row, saveLead);
  const auto = ifNode(wf, "Send automatically?", condition(`={{ ${S}.autoSendReplies }}`, "true", "", "boolean"), [1260, -100]);
  wf.connect(saveLead, auto);
  const reply = { to: "={{ $('Lead row').item.json.email }}", subject: "={{ $('Lead row').item.json.reply_subject }}", message: "={{ $('Lead row').item.json.reply_body }}" };
  const send = gmailSend(wf, "Send first reply", reply, [1480, -200]);
  const draft = gmailDraft(wf, "Draft first reply", reply, [1480, 0]);
  wf.connect(auto, send, { output: 0 });
  wf.connect(auto, draft, { output: 1 });
  const hot = ifNode(wf, "Hot lead?", condition("={{ $('Lead row').item.json.score }}", "equals", "hot"), [1700, -100]);
  wf.connect(send, hot);
  wf.connect(draft, hot);
  wf.connect(hot, gmailSend(wf, "Alert team about hot lead", {
    to: `={{ ${S}.teamEmail }}`,
    subject: "=Hot lead: {{ $('Lead row').item.json.name }} ({{ $('Lead row').item.json.company || $('Lead row').item.json.email }})",
    message: "=A hot lead just came in.\n\nName: {{ $('Lead row').item.json.name }}\nEmail: {{ $('Lead row').item.json.email }}\nPhone: {{ $('Lead row').item.json.phone }}\nCompany: {{ $('Lead row').item.json.company }}\nBudget: {{ $('Lead row').item.json.budget }}\n\nSummary: {{ $('Lead row').item.json.summary }}\nWhy hot: {{ $('Lead row').item.json.reason }}\n\nMessage:\n{{ $('Lead row').item.json.message }}",
  }, [1920, -200]), { output: 0 });

  const noEmail = code(wf, "Lead row (no email)", [], `
return $input.all().map((item, i) => ({ pairedItem: { item: i }, json: {
  lead_id: item.json.lead_id, received_at: item.json.received_at, source: item.json.source, name: item.json.name, email: '',
  phone: item.json.phone, company: item.json.company, message: item.json.message, budget: item.json.budget,
  score: '', reason: '', summary: '', status: 'call - no email', follow_ups: 0, last_contact_at: '', replied_at: '',
} }));`, [600, 140]);
  wf.connect(hasEmail, noEmail, { output: 1 });
  const saveNoEmail = sheetsAppend(wf, "Save lead (no email)", "Leads", [820, 140]);
  wf.connect(noEmail, saveNoEmail);
  wf.connect(saveNoEmail, gmailSend(wf, "Ask team to call", {
    to: `={{ ${S}.teamEmail }}`,
    subject: "=New lead to call: {{ $('Lead row (no email)').item.json.name || $('Lead row (no email)').item.json.phone }}",
    message: "=This lead left no email address, so no automatic reply was sent. Please call them.\n\nName: {{ $('Lead row (no email)').item.json.name }}\nPhone: {{ $('Lead row (no email)').item.json.phone }}\nMessage: {{ $('Lead row (no email)').item.json.message }}",
  }, [1040, 140]));

  // Follow-ups
  const read = sheetsRead(wf, "Read leads", "Leads", [160, 420]);
  wf.connect(r, read, { output: 1 });
  const due = code(wf, "Leads due a follow-up", [L.dueFollowUps, L.buildFollowUpRequest], `
const s = ${S};
const input = $input.all();
const index = new Map(input.map((it, i) => [it.json, i]));
const rows = input.map((i) => i.json).filter((r) => r.lead_id);
return dueFollowUps(rows, new Date().toISOString(), Number(s.followUpDays), Number(s.maxFollowUps)).map((row) => {
  const n = Number(row.follow_ups || 0) + 1;
  return { json: { ...row, follow_up_number: n, request: buildFollowUpRequest(row, n, s) }, pairedItem: { item: index.get(row) } };
});`, [380, 420]);
  wf.connect(read, due);
  const writeFu = openAi(wf, "Write follow-up with AI", [600, 420]);
  wf.connect(due, writeFu);
  const fuRow = code(wf, "Follow-up email", [L.readAiJson], `
const rows = $('Leads due a follow-up').all();
return $input.all().map((item, i) => {
  const row = rows[i].json;
  const ai = readAiJson(item.json);
  return { json: { lead_id: row.lead_id, email: row.email, follow_ups: row.follow_up_number, last_contact_at: new Date().toISOString(),
    subject: ai.subject || 'Following up', body: ai.reply || '' }, pairedItem: { item: i } };
});`, [820, 420]);
  wf.connect(writeFu, fuRow);
  const auto2 = ifNode(wf, "Send follow-up automatically?", condition(`={{ ${S}.autoSendReplies }}`, "true", "", "boolean"), [1040, 420]);
  wf.connect(fuRow, auto2);
  const fuMail = { to: "={{ $json.email }}", subject: "={{ $json.subject }}", message: "={{ $json.body }}" };
  const fuSend = gmailSend(wf, "Send follow-up", fuMail, [1260, 340]);
  const fuDraft = gmailDraft(wf, "Draft follow-up", fuMail, [1260, 500]);
  wf.connect(auto2, fuSend, { output: 0 });
  wf.connect(auto2, fuDraft, { output: 1 });
  const fuUpdateRow = code(wf, "Follow-up update", [], `
return $input.all().map((_, i) => {
  const r = $('Follow-up email').all()[i].json;
  return { json: { lead_id: r.lead_id, follow_ups: r.follow_ups, last_contact_at: r.last_contact_at }, pairedItem: { item: i } };
});`, [1480, 420]);
  wf.connect(fuSend, fuUpdateRow);
  wf.connect(fuDraft, fuUpdateRow);
  wf.connect(fuUpdateRow, sheetsUpdate(wf, "Record follow-up", "Leads", "lead_id", [1700, 420]));

  // Replies
  const readR = sheetsRead(wf, "Read leads (replies)", "Leads", [160, 680], { executeOnce: true });
  wf.connect(r, readR, { output: 2 });
  const match = code(wf, "Match replies to leads", [L.emailAddress], `
const senders = new Set($('Lead replied by email').all().map((m) => emailAddress(m.json.From || m.json.from)));
const now = new Date().toISOString();
return $input.all()
  .map((item, i) => ({ row: item.json, i }))
  .filter(({ row }) => row.lead_id && row.email && senders.has(String(row.email).toLowerCase()) && String(row.status).toLowerCase() === 'contacted')
  .map(({ row, i }) => ({ json: { lead_id: row.lead_id, status: 'replied', replied_at: now, name: row.name, email: row.email }, pairedItem: { item: i } }));`, [380, 680]);
  wf.connect(readR, match);
  const markReplied = sheetsUpdate(wf, "Mark lead as replied", "Leads", "lead_id", [600, 680]);
  wf.connect(match, markReplied);
  wf.connect(markReplied, gmailSend(wf, "Tell team about reply", {
    to: `={{ ${S}.teamEmail }}`,
    subject: "=Lead replied: {{ $('Match replies to leads').item.json.name || $('Match replies to leads').item.json.email }}",
    message: "={{ $('Match replies to leads').item.json.name }} ({{ $('Match replies to leads').item.json.email }}) replied. Follow-ups for this lead have stopped. Check your inbox to continue the conversation.",
  }, [820, 680]));

  save("01-ai-lead-generation-follow-up", wf);
}

// ===================================================================================== 2. customer service bot
function chatBot(wf, { title, subtitle, welcome }) {
  return wf.add("Chat", "@n8n/n8n-nodes-langchain.chatTrigger", 1.1, {
    public: true,
    mode: "hostedChat",
    initialMessages: welcome,
    options: { title, subtitle, inputPlaceholder: "Type your message...", showWelcomeScreen: false },
  }, [-560, 0], { webhookId: uid("hook") });
}

function chatModel(wf, position, temperature) {
  return wf.add("OpenAI chat model", "@n8n/n8n-nodes-langchain.lmChatOpenAi", 1.2, {
    model: { __rl: true, mode: "id", value: `={{ ${S}.openAiModel }}` },
    options: { temperature, baseURL: `={{ ${S}.openAiBaseUrl }}` },
  }, position);
}

function memory(wf, position) {
  return wf.add("Conversation memory", "@n8n/n8n-nodes-langchain.memoryBufferWindow", 1.3, {
    sessionIdType: "customKey", sessionKey: "={{ $('Chat').first().json.sessionId }}", contextWindowLength: 12,
  }, position);
}

{
  const wf = new Workflow("AI Customer Service Chatbot | Ranime Jemal Agency");
  wf.note("## AI Customer Service Chatbot\n1. Fill in **Settings**.\n2. Make a Google Sheet with an **FAQ** tab (question, answer) and a **Conversations** tab (see the CSV files).\n3. Connect OpenAI, Google Sheets and Gmail.\n4. Activate, then open the **Chat** node to copy the chat URL or the website embed code.", [-560, -400], 520, 260);
  const chat = chatBot(wf, { title: "Customer support", subtitle: "We usually answer instantly.", welcome: "Hi! How can I help you today?" });
  const set = settings(wf, [
    ["businessName", "Your business name"],
    ["businessDescription", "What you sell and to whom."],
    ["openingHours", "Monday to Friday, 9:00 to 18:00"],
    ["contactDetails", "support@yourbusiness.com, +33 6 00 00 00 00"],
    ["tone", "friendly, short and clear"],
    ["teamEmail", "support@yourbusiness.com"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ...COMMON_AI,
  ], [-320, 0]);
  wf.connect(chat, set);
  const agent = wf.add("Customer service agent", "@n8n/n8n-nodes-langchain.agent", 2.2, {
    promptType: "define",
    text: "={{ $('Chat').first().json.chatInput }}",
    options: {
      systemMessage: `=You are the customer service assistant of {{ ${S}.businessName }}. {{ ${S}.businessDescription }}
Tone: {{ ${S}.tone }}. Always answer in the customer's language.
Opening hours: {{ ${S}.openingHours }}. Contact: {{ ${S}.contactDetails }}.

Rules:
- Before answering any question about the business, its products, prices, delivery, returns or policies, call the "faq" tool and answer only from what it returns.
- If the FAQ does not cover the question, say you are not sure and offer to pass the question to the team.
- Never invent prices, delivery dates, discounts or policies.
- If the customer is upset, asks for a person, or needs something you cannot do (refunds, order changes, complaints), collect their name and email or phone, then call "handoff_to_team" and tell them a person will get back to them.
- Keep answers short: two to four sentences unless the customer asks for detail.`,
      maxIterations: 6,
    },
  }, [-80, 0]);
  wf.connect(set, agent);
  wf.connect(chatModel(wf, [-220, 240], 0.3), agent, { type: "ai_languageModel" });
  wf.connect(memory(wf, [-60, 240]), agent, { type: "ai_memory" });
  const faq = wf.add("faq", "n8n-nodes-base.googleSheetsTool", 4.5, {
    descriptionType: "manual",
    toolDescription: "Returns the business FAQ as rows with a question and an answer. Use it to answer questions about products, prices, delivery, returns, opening hours and policies.",
    documentId: sheetDoc, sheetName: sheetTab("FAQ"), options: {},
  }, [100, 240]);
  wf.connect(faq, agent, { type: "ai_tool" });
  const handoff = wf.add("handoff_to_team", "n8n-nodes-base.gmailTool", 2.1, {
    descriptionType: "manual",
    toolDescription: "Sends the conversation to a human team member. Use it when the customer asks for a person, is upset, or needs something you cannot do. Include the customer's name, contact details and a short summary.",
    sendTo: `={{ ${S}.teamEmail }}`,
    subject: "=Chatbot handoff: {{ $fromAI('customer_name', 'Customer name', 'string') }}",
    emailType: "text",
    message: "=Customer: {{ $fromAI('customer_name', 'Customer name', 'string') }}\nContact: {{ $fromAI('customer_contact', 'Customer email or phone number', 'string') }}\n\nSummary:\n{{ $fromAI('summary', 'What the customer needs, in a few sentences', 'string') }}\n\nChat session: {{ $('Chat').first().json.sessionId }}",
    options: { appendAttribution: false },
  }, [260, 240]);
  wf.connect(handoff, agent, { type: "ai_tool" });
  const log = code(wf, "Conversation row", [], `
return [{ json: {
  time: new Date().toISOString(),
  session_id: $('Chat').first().json.sessionId,
  question: $('Chat').first().json.chatInput,
  answer: $input.first().json.output,
}, pairedItem: { item: 0 } }];`, [220, 0]);
  wf.connect(agent, log);
  const saveLog = sheetsAppend(wf, "Log conversation", "Conversations", [440, 0], { onError: "continueRegularOutput" });
  wf.connect(log, saveLog);
  wf.connect(saveLog, wf.add("Reply", "n8n-nodes-base.set", 3.4, {
    mode: "manual",
    assignments: { assignments: [{ id: uid("set"), name: "output", value: "={{ $('Customer service agent').first().json.output }}", type: "string" }] },
    options: {},
  }, [660, 0]));
  save("02-ai-customer-service-chatbot", wf);
}

// ===================================================================================== 3. appointment booking
{
  const wf = new Workflow("AI Appointment Booking | Ranime Jemal Agency");
  wf.note("## AI Appointment Booking\n1. Fill in **Settings** (calendar ID: Google Calendar > Settings > Integrate calendar).\n2. Connect OpenAI, Google Calendar and Gmail.\n3. Activate. Share the chat URL from the **Chat** node, or embed it on your site.\nReminders are emailed every hour for appointments starting in 24 hours.", [-560, -420], 520, 260);
  const chat = chatBot(wf, { title: "Book an appointment", subtitle: "Pick a time that suits you.", welcome: "Hi! I can book, move or cancel an appointment for you. What would you like to do?" });
  const hourly = schedule(wf, "Every hour", "5 * * * *", [-560, 460]);
  const set = settings(wf, [
    ["businessName", "Your business name"],
    ["services", "Haircut (60 min), Colour (60 min), Consultation (60 min)"],
    ["address", "12 Example Street, Paris"],
    ["calendarId", "primary"],
    ["timezone", "Europe/Paris"],
    ["openDays", "Monday to Saturday"],
    ["openTime", "09:00"],
    ["closeTime", "18:00"],
    ["slotMinutes", 60, "number"],
    ["reminderHoursBefore", 24, "number"],
    ["senderName", "Your business name"],
    ...COMMON_AI,
  ], [-320, 200]);
  wf.connect(chat, set);
  wf.connect(hourly, set);
  const r = route(wf, [["Chat", ["Chat"]], ["Reminders", ["Every hour"]]], [-100, 200]);
  wf.connect(set, r);
  const agent = wf.add("Booking assistant", "@n8n/n8n-nodes-langchain.agent", 2.2, {
    promptType: "define",
    text: "={{ $('Chat').first().json.chatInput }}",
    options: {
      systemMessage: `=You book appointments for {{ ${S}.businessName }} ({{ ${S}.address }}).
Services: {{ ${S}.services }}.
Opening hours: {{ ${S}.openDays }}, {{ ${S}.openTime }} to {{ ${S}.closeTime }}, time zone {{ ${S}.timezone }}. Appointments last {{ ${S}.slotMinutes }} minutes.
Current date and time: {{ $now.setZone(${S}.timezone).toFormat("cccc d LLLL yyyy, HH:mm") }}.

How to work:
- Answer in the customer's language. Be brief and friendly.
- To find free times, call "check_availability" for the day asked (from the opening time to the closing time). It returns the busy periods; offer up to three free start times inside opening hours that do not overlap them.
- Before booking you need: the service, the date and time, the customer's full name, email and phone number.
- Book with "book_appointment" only after the customer confirms the exact time. Use ISO 8601 times with the {{ ${S}.timezone }} offset.
- To move or cancel, ask for their email, call "find_bookings" to find the appointment, confirm which one, then "cancel_booking" (and book the new time when moving).
- Never book outside opening hours or in the past. Never invent availability.`,
      maxIterations: 8,
    },
  }, [200, -100]);
  wf.connect(r, agent, { output: 0 });
  wf.connect(chatModel(wf, [140, 140], 0.2), agent, { type: "ai_languageModel" });
  wf.connect(memory(wf, [300, 140]), agent, { type: "ai_memory" });
  const cal = { __rl: true, mode: "id", value: `={{ ${S}.calendarId }}` };
  wf.connect(wf.add("check_availability", "n8n-nodes-base.googleCalendarTool", 1.3, {
    descriptionType: "manual",
    toolDescription: "Returns the busy periods in the calendar between two times. Use it before offering times.",
    resource: "calendar",
    calendar: cal,
    timeMin: "={{ $fromAI('start', 'Start of the period to check, ISO 8601 with time zone offset', 'string') }}",
    timeMax: "={{ $fromAI('end', 'End of the period to check, ISO 8601 with time zone offset', 'string') }}",
    options: { outputFormat: "bookedSlots", timezone: { __rl: true, mode: "id", value: `={{ ${S}.timezone }}` } },
  }, [460, 140]), agent, { type: "ai_tool" });
  wf.connect(wf.add("book_appointment", "n8n-nodes-base.googleCalendarTool", 1.3, {
    descriptionType: "manual",
    toolDescription: "Books an appointment in the calendar and emails the customer an invitation.",
    calendar: cal,
    start: "={{ $fromAI('start', 'Appointment start, ISO 8601 with time zone offset', 'string') }}",
    end: "={{ $fromAI('end', 'Appointment end, ISO 8601 with time zone offset', 'string') }}",
    additionalFields: {
      summary: "={{ $fromAI('service', 'The service booked', 'string') }} - {{ $fromAI('customer_name', 'Customer full name', 'string') }}",
      attendees: "={{ $fromAI('customer_email', 'Customer email address', 'string') }}",
      description: "=Customer: {{ $fromAI('customer_name', 'Customer full name', 'string') }}\nEmail: {{ $fromAI('customer_email', 'Customer email address', 'string') }}\nPhone: {{ $fromAI('customer_phone', 'Customer phone number', 'string') }}\nNotes: {{ $fromAI('notes', 'Anything else the customer mentioned', 'string') }}\nBooked by the AI assistant.",
      sendUpdates: "all",
    },
  }, [620, 140]), agent, { type: "ai_tool" });
  wf.connect(wf.add("find_bookings", "n8n-nodes-base.googleCalendarTool", 1.3, {
    descriptionType: "manual",
    toolDescription: "Finds upcoming appointments for a customer by their email address. Returns event IDs, times and titles.",
    operation: "getAll",
    calendar: cal,
    returnAll: true,
    timeMin: "={{ $now.toISO() }}",
    timeMax: "={{ $now.plus({ days: 90 }).toISO() }}",
    options: { query: "={{ $fromAI('customer_email', 'Customer email address', 'string') }}", singleEvents: true, orderBy: "startTime" },
  }, [780, 140]), agent, { type: "ai_tool" });
  wf.connect(wf.add("cancel_booking", "n8n-nodes-base.googleCalendarTool", 1.3, {
    descriptionType: "manual",
    toolDescription: "Cancels an appointment by its event ID (from find_bookings) and notifies the customer.",
    operation: "delete",
    calendar: cal,
    eventId: "={{ $fromAI('event_id', 'The event ID of the appointment to cancel', 'string') }}",
    options: { sendUpdates: "all" },
  }, [940, 140]), agent, { type: "ai_tool" });

  const events = wf.add("Upcoming appointments", "n8n-nodes-base.googleCalendar", 1.3, {
    operation: "getAll",
    calendar: cal,
    returnAll: true,
    timeMin: `={{ $now.plus({ hours: ${S}.reminderHoursBefore }).toISO() }}`,
    timeMax: `={{ $now.plus({ hours: ${S}.reminderHoursBefore + 1 }).toISO() }}`,
    options: { singleEvents: true },
  }, [200, 460]);
  wf.connect(r, events, { output: 1 });
  const due = code(wf, "Reminders to send", [L.dueReminders], `
const s = ${S};
const input = $input.all();
const events = input.map((i) => i.json).filter((e) => e.id);
const index = new Map(input.map((it, i) => [it.json.id, i]));
return dueReminders(events, new Date().toISOString(), Number(s.reminderHoursBefore)).map((r) => ({ json: {
  ...r,
  when: DateTime.fromISO(r.start).setZone(s.timezone).toFormat("cccc d LLLL 'at' HH:mm"),
}, pairedItem: { item: index.get(r.event_id) } }));`, [420, 460]);
  wf.connect(events, due);
  wf.connect(due, gmailSend(wf, "Send reminder", {
    to: "={{ $json.email }}",
    subject: `=Reminder: your appointment at {{ ${S}.businessName }}`,
    message: `=Hello,\n\nThis is a reminder of your appointment ({{ $json.summary }}) on {{ $json.when }} at {{ ${S}.address }}.\n\nIf you need to change it, just reply to this email.\n\nSee you soon,\n{{ ${S}.senderName }}`,
  }, [640, 460]));
  save("03-ai-appointment-booking", wf);
}

// ===================================================================================== 4. social media
{
  const wf = new Workflow("AI Social Media Automation | Ranime Jemal Agency");
  wf.note("## AI Social Media Automation\n1. Fill in **Settings**.\n2. Make a Google Sheet with a **Content plan** tab (columns in `content-plan.csv`). Add one row per post: post_id, publish_at, topic, status = idea.\n3. Every Monday the AI writes the posts and emails the approver. Change status to **approved** in the sheet to publish.\n4. Every hour the next approved post whose time has come is published (one post per hour).\n5. Connect OpenAI, Google Sheets, Gmail, Facebook Graph API (page token) and LinkedIn. X is disabled: enable it if you have API access.", [-560, -460], 560, 320);
  const weekly = schedule(wf, "Every Monday at 8:00", "0 8 * * 1", [-560, 0]);
  const hourly = schedule(wf, "Every hour", "10 * * * *", [-560, 400]);
  const set = settings(wf, [
    ["businessName", "Your brand"],
    ["businessDescription", "What the brand does, in one or two sentences."],
    ["brandVoice", "warm, confident, no jargon"],
    ["language", "English"],
    ["defaultCallToAction", "Send us a message to learn more."],
    ["approverEmail", "you@yourbrand.com"],
    ["facebookPageId", "YOUR_FACEBOOK_PAGE_ID"],
    ["instagramAccountId", "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID"],
    ["linkedinOrganizationId", "YOUR_LINKEDIN_ORGANIZATION_ID"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ["daysAhead", 7, "number"],
    ["senderName", "Social media assistant"],
    ...COMMON_AI,
  ], [-320, 200]);
  wf.connect(weekly, set);
  wf.connect(hourly, set);
  const r = route(wf, [["Write drafts", [weekly]], ["Publish", [hourly]]], [-100, 200]);
  wf.connect(set, r);

  const read = sheetsRead(wf, "Read content plan", "Content plan", [160, 0]);
  wf.connect(r, read, { output: 0 });
  const pick = code(wf, "Posts to write", [L.contentToDraft, L.buildCaptionRequest], `
const s = ${S};
const input = $input.all();
const index = new Map(input.map((it, i) => [it.json, i]));
const rows = input.map((i) => i.json).filter((r) => r.post_id);
return contentToDraft(rows, new Date().toISOString(), Number(s.daysAhead)).map((row) => ({ json: { ...row, request: buildCaptionRequest(row, s) }, pairedItem: { item: index.get(row) } }));`, [380, 0]);
  wf.connect(read, pick);
  const write = openAi(wf, "Write posts with AI", [600, 0]);
  wf.connect(pick, write);
  const drafts = code(wf, "Draft rows", [L.readAiJson], `
const rows = $('Posts to write').all();
return $input.all().map((item, i) => {
  const row = rows[i].json;
  const ai = readAiJson(item.json);
  return { json: { post_id: row.post_id, status: 'waiting approval', instagram: ai.instagram || '', facebook: ai.facebook || '',
    linkedin: ai.linkedin || '', x: ai.x || '', hashtags: ai.hashtags || '', topic: row.topic, publish_at: row.publish_at }, pairedItem: { item: i } };
});`, [820, 0]);
  wf.connect(write, drafts);
  const saveDrafts = sheetsUpdate(wf, "Save drafts", "Content plan", "post_id", [1040, 0]);
  wf.connect(drafts, saveDrafts);
  const summary = code(wf, "Approval summary", [], `
const posts = $('Draft rows').all().map((i) => i.json);
const list = posts.map((p) => '- ' + p.publish_at + ': ' + p.topic).join('\\n');
return [{ json: { count: posts.length, list }, pairedItem: $input.all().map((_, i) => ({ item: i })) }];`, [1260, 0]);
  wf.connect(saveDrafts, summary);
  wf.connect(summary, gmailSend(wf, "Ask for approval", {
    to: `={{ ${S}.approverEmail }}`,
    subject: "={{ $json.count }} social posts are ready for approval",
    message: `=Hello,\n\nThe posts for the coming days are written:\n{{ $json.list }}\n\nOpen the content plan, check and edit the texts, then set the status to "approved" for each post you want published:\n{{ ${S}.googleSheetUrl }}\n\nApproved posts are published automatically at their publish time.`,
  }, [1480, 0]));

  const readP = sheetsRead(wf, "Read approved posts", "Content plan", [160, 400]);
  wf.connect(r, readP, { output: 1 });
  publishBranch(wf, readP, { status: "approved", tab: "Content plan", y: 400 });
  save("04-ai-social-media-automation", wf);
}

// ===================================================================================== 5. voice receptionist
{
  const wf = new Workflow("AI Voice Receptionist (Vapi) | Ranime Jemal Agency");
  wf.note("## AI Voice Receptionist\nThe voice agent runs on **Vapi** (see `vapi-assistant.json`). This workflow is its back office:\n- **Vapi tools** answers the assistant's tool calls: check_availability, book_appointment, take_message.\n- **Vapi call events** logs each finished call and emails you the summary.\n1. Fill in **Settings**. 2. Create a Header Auth credential (name `x-vapi-secret`, value = your Vapi server secret) and select it on both webhooks. 3. Connect Google Calendar, Google Sheets and Gmail. 4. Activate and paste the production webhook URLs into Vapi.", [-560, -480], 560, 340);
  const tools = webhook(wf, "Vapi tools", "vapi/tools", [-560, 0], { respond: "responseNode", headerAuth: true });
  const events = webhook(wf, "Vapi call events", "vapi/events", [-560, 560], { headerAuth: true });
  const set = settings(wf, [
    ["businessName", "Your business name"],
    ["calendarId", "primary"],
    ["timezone", "Europe/Paris"],
    ["openDays", "1,2,3,4,5,6"],
    ["openTime", "09:00"],
    ["closeTime", "18:00"],
    ["slotMinutes", 60, "number"],
    ["teamEmail", "you@yourbusiness.com"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ["senderName", "AI receptionist"],
  ], [-320, 280]);
  wf.connect(tools, set);
  wf.connect(events, set);
  const r = route(wf, [["Tool call", ["Vapi tools"]], ["Call event", ["Vapi call events"]]], [-100, 280]);
  wf.connect(set, r);

  const calls = code(wf, "Read tool calls", [L.parseVapiToolCalls], `
const calls = parseVapiToolCalls($('Vapi tools').first().json.body);
return (calls.length ? calls : [{ toolCallId: '', name: 'none', args: {} }]).map((c) => ({ json: c, pairedItem: { item: 0 } }));`, [160, 0]);
  wf.connect(r, calls, { output: 0 });
  const which = wf.add("Which tool?", "n8n-nodes-base.switch", 3.2, {
    rules: { values: ["check_availability", "book_appointment", "take_message"].map((name) => ({
      conditions: condition("={{ $json.name }}", "equals", name), renameOutput: true, outputKey: name,
    })) },
    options: { fallbackOutput: "extra", renameFallbackOutput: "Unknown" },
  }, [380, 0]);
  wf.connect(calls, which);
  const cal = { __rl: true, mode: "id", value: `={{ ${S}.calendarId }}` };
  const dayEvents = (name, pos) => wf.add(name, "n8n-nodes-base.googleCalendar", 1.3, {
    operation: "getAll", calendar: cal, returnAll: true,
    timeMin: `={{ DateTime.fromISO(String($json.args.date).slice(0, 10), { zone: ${S}.timezone }).startOf('day').toISO() }}`,
    timeMax: `={{ DateTime.fromISO(String($json.args.date).slice(0, 10), { zone: ${S}.timezone }).endOf('day').toISO() }}`,
    options: { singleEvents: true },
  }, pos, { alwaysOutputData: true, executeOnce: true });
  const respond = wf.add("Answer Vapi", "n8n-nodes-base.respondToWebhook", 1.1, {
    respondWith: "json",
    responseBody: "={{ JSON.stringify({ results: [{ toolCallId: $json.toolCallId, result: $json.result }] }) }}",
    options: {},
  }, [1700, 200]);

  const availEvents = dayEvents("Events that day", [600, -200]);
  wf.connect(which, availEvents, { output: 0 });
  const slots = code(wf, "Free times", [L.freeSlots], `
const s = ${S};
const call = $('Read tool calls').all().find((c) => c.json.name === 'check_availability').json;
const events = $input.all().map((i) => i.json).filter((e) => e.id);
const day = freeSlots(DateTime, events, call.args.date, { ...s, slotMinutes: Number(s.slotMinutes) });
const result = day.slots.length
  ? 'Free start times on ' + day.weekday + ' ' + day.date + ': ' + day.slots.join(', ') + '.'
  : (day.note || 'No free times that day.') + ' Offer another day.';
return [{ json: { toolCallId: call.toolCallId, result }, pairedItem: { item: 0 } }];`, [820, -200]);
  wf.connect(availEvents, slots);
  wf.connect(slots, respond);

  const bookEvents = dayEvents("Events on booking day", [600, 0]);
  wf.connect(which, bookEvents, { output: 1 });
  const check = code(wf, "Is the time free?", [L.freeSlots, L.bookingTimes], `
const s = { ...${S} };
s.slotMinutes = Number(s.slotMinutes);
const call = $('Read tool calls').all().find((c) => c.json.name === 'book_appointment').json;
const events = $input.all().map((i) => i.json).filter((e) => e.id);
const times = bookingTimes(DateTime, call.args, s);
const free = times.ok && freeSlots(DateTime, events, call.args.date, s).slots.includes(String(call.args.time).slice(0, 5));
return [{ json: { ...call, ...times, free, caller_number: call.caller_number,
  message: times.ok ? (free ? '' : 'That time is not available. Check availability and offer another time.') : times.message }, pairedItem: { item: 0 } }];`, [820, 0]);
  wf.connect(bookEvents, check);
  const isFree = ifNode(wf, "Free?", condition("={{ $json.free }}", "true", "", "boolean"), [1040, 0]);
  wf.connect(check, isFree);
  const create = wf.add("Book in calendar", "n8n-nodes-base.googleCalendar", 1.3, {
    calendar: cal, start: "={{ $json.start }}", end: "={{ $json.end }}",
    additionalFields: {
      summary: "={{ $json.args.service || 'Appointment' }} - {{ $json.args.name }}",
      description: "=Booked by phone with the AI receptionist.\nName: {{ $json.args.name }}\nPhone: {{ $json.args.phone || $json.caller_number }}\nNotes: {{ $json.args.notes || '' }}",
    },
  }, [1260, -80]);
  wf.connect(isFree, create, { output: 0 });
  const booked = code(wf, "Booking confirmed", [], `
const c = $('Is the time free?').first().json;
return [{ json: { toolCallId: c.toolCallId, result: 'Booked: ' + c.label + ' for ' + c.args.name + '. Confirm this to the caller.' }, pairedItem: { item: 0 } }];`, [1480, -80]);
  wf.connect(create, booked);
  wf.connect(booked, respond);
  const notFree = code(wf, "Booking refused", [], `
const c = $input.first().json;
return [{ json: { toolCallId: c.toolCallId, result: c.message }, pairedItem: { item: 0 } }];`, [1260, 100]);
  wf.connect(isFree, notFree, { output: 1 });
  wf.connect(notFree, respond);

  const msg = gmailSend(wf, "Email the message", {
    to: `={{ ${S}.teamEmail }}`,
    subject: "=Phone message from {{ $json.args.name || $json.caller_number || 'a caller' }}",
    message: "=The AI receptionist took a message.\n\nName: {{ $json.args.name }}\nCall back on: {{ $json.args.phone || $json.caller_number }}\nUrgent: {{ $json.args.urgent ? 'yes' : 'no' }}\n\nMessage:\n{{ $json.args.message }}",
  }, [600, 200]);
  wf.connect(which, msg, { output: 2 });
  const msgDone = code(wf, "Message taken", [], `
const c = $('Read tool calls').all().find((x) => x.json.name === 'take_message').json;
return [{ json: { toolCallId: c.toolCallId, result: 'The message has been passed on to the team. Tell the caller someone will call them back.' }, pairedItem: { item: 0 } }];`, [820, 200]);
  wf.connect(msg, msgDone);
  wf.connect(msgDone, respond);
  const unknown = code(wf, "Unknown tool", [], `
return [{ json: { toolCallId: $input.first().json.toolCallId, result: 'That action is not available. Offer to take a message instead.' }, pairedItem: { item: 0 } }];`, [600, 380]);
  wf.connect(which, unknown, { output: 3 });
  wf.connect(unknown, respond);

  const report = code(wf, "Call report", [], `
const m = ($('Vapi call events').first().json.body || {}).message || {};
if (m.type !== 'end-of-call-report') return [];
const call = m.call || {};
const analysis = m.analysis || {};
return [{ json: {
  call_id: call.id || '',
  ended_at: m.endedAt || new Date().toISOString(),
  caller_number: (call.customer && call.customer.number) || '',
  duration_seconds: m.durationSeconds || '',
  ended_reason: m.endedReason || '',
  summary: analysis.summary || m.summary || '',
  transcript: String(m.transcript || (m.artifact && m.artifact.transcript) || '').slice(0, 45000),
  recording_url: m.recordingUrl || (m.artifact && m.artifact.recordingUrl) || '',
  cost: m.cost || '',
}, pairedItem: { item: 0 } }];`, [160, 560]);
  wf.connect(r, report, { output: 1 });
  const logCall = sheetsAppend(wf, "Log call", "Calls", [380, 560]);
  wf.connect(report, logCall);
  wf.connect(logCall, gmailSend(wf, "Email call summary", {
    to: `={{ ${S}.teamEmail }}`,
    subject: "=Call from {{ $('Call report').item.json.caller_number || 'unknown number' }}",
    message: "=Summary: {{ $('Call report').item.json.summary }}\n\nCaller: {{ $('Call report').item.json.caller_number }}\nDuration: {{ $('Call report').item.json.duration_seconds }} s\nRecording: {{ $('Call report').item.json.recording_url }}\n\nTranscript:\n{{ $('Call report').item.json.transcript }}",
  }, [600, 560]));
  save("05-ai-voice-receptionist", wf);
}

// ===================================================================================== 6. document processing
{
  const wf = new Workflow("AI Document Processing | Ranime Jemal Agency");
  wf.note("## AI Document Processing\nReads invoices and receipts (PDF or photo) from **email** or an **upload form**, extracts the data with AI, checks it, files the document in Google Drive and logs it in Google Sheets. Anything that does not add up is flagged for review.\n1. Fill in **Settings** (Drive folder ID is the last part of the folder URL).\n2. Make a Google Sheet with a **Documents** tab (columns in `documents-sheet.csv`).\n3. Connect Gmail, Google Drive, Google Sheets and OpenAI. 4. Activate.", [-560, -460], 560, 300);
  const mail = wf.add("Document received by email", "n8n-nodes-base.gmailTrigger", 1.2, {
    pollTimes: { item: [{ mode: "everyX", value: 5, unit: "minutes" }] },
    simple: false,
    filters: { q: "has:attachment (filename:pdf OR filename:jpg OR filename:jpeg OR filename:png) -from:me" },
    options: { downloadAttachments: true, dataPropertyAttachmentsPrefixName: "attachment_" },
  }, [-560, 0]);
  const upload = wf.add("Upload form", "n8n-nodes-base.formTrigger", 2.2, {
    formTitle: "Upload invoices and receipts",
    formDescription: "PDF, JPG or PNG. You can select several files.",
    formFields: { values: [{ fieldLabel: "Documents", fieldType: "file", multipleFiles: true, acceptFileTypes: ".pdf,.jpg,.jpeg,.png", requiredField: true }] },
    options: { appendAttribution: false, respondWithOptions: { values: { respondWith: "text", formSubmittedText: "Thanks! The documents are being processed." } } },
  }, [-560, 200], { webhookId: uid("hook") });
  const set = settings(wf, [
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ["driveFolderId", "YOUR_DRIVE_FOLDER_ID"],
    ["teamEmail", "accounts@yourbusiness.com"],
    ["minImageKb", 30, "number"],
    ["senderName", "Document assistant"],
    ...COMMON_AI,
  ], [-320, 100]);
  wf.connect(mail, set);
  wf.connect(upload, set);
  const split = code(wf, "One item per file", [], `
const s = ${S};
const fromEmail = $('Document received by email').isExecuted;
const out = [];
$input.all().forEach((item, index) => {
  for (const [key, file] of Object.entries(item.binary || {})) {
    const mime = file.mimeType || '';
    const supported = mime === 'application/pdf' || /^image\\/(png|jpe?g|webp)$/.test(mime);
    if (!supported) continue;
    // Skip small images in emails: usually logos and signatures, not receipts.
    const kb = Number(String(file.fileSize || '0').replace(/[^0-9.]/g, '')) * (/mb/i.test(String(file.fileSize)) ? 1024 : 1);
    if (fromEmail && mime.startsWith('image/') && kb && kb < Number(s.minImageKb)) continue;
    const from = fromEmail ? ((item.json.from && item.json.from.text) || item.json.from || '') : 'upload form';
    out.push({ json: { file_name: file.fileName || key, mime_type: mime, source: fromEmail ? 'email' : 'upload', received_from: String(from), email_subject: item.json.subject || '' },
      binary: { data: file }, pairedItem: { item: index } });
  }
});
return out;`, [-100, 100]);
  wf.connect(set, split);
  const prep = code(wf, "Prepare extraction", [L.documentPart, L.buildExtractRequest], PREPARE_EXTRACTION_JS, [120, 100]);
  wf.connect(split, prep);
  const extract = openAi(wf, "Extract data with AI", [340, 100]);
  wf.connect(prep, extract);
  const checked = code(wf, "Check the data", [L.readAiJson, L.checkExtraction, L.documentFileName], CHECK_DATA_JS, [560, 100]);
  wf.connect(extract, checked);
  const drive = wf.add("Save to Google Drive", "n8n-nodes-base.googleDrive", 3, {
    name: "={{ $json.drive_name }}",
    driveId: { __rl: true, mode: "list", value: "My Drive" },
    folderId: { __rl: true, mode: "id", value: `={{ ${S}.driveFolderId }}` },
    options: {},
  }, [780, 100]);
  wf.connect(checked, drive);
  const row = code(wf, "Document row", [], `
const rows = $('Check the data').all();
return $input.all().map((item, i) => {
  const { drive_name, ...data } = rows[i].json;
  return { json: { ...data, drive_file: drive_name, drive_link: item.json.webViewLink || ('https://drive.google.com/file/d/' + item.json.id + '/view') }, pairedItem: { item: i } };
});`, [1000, 100]);
  wf.connect(drive, row);
  const log = sheetsAppend(wf, "Log in sheet", "Documents", [1220, 100]);
  wf.connect(row, log);
  const review = ifNode(wf, "Needs review?", condition("={{ $('Document row').item.json.status }}", "equals", "needs review"), [1440, 100]);
  wf.connect(log, review);
  wf.connect(review, gmailSend(wf, "Ask for a review", {
    to: `={{ ${S}.teamEmail }}`,
    subject: "=Please check: {{ $('Document row').item.json.original_file }}",
    message: `=A document needs a quick check: {{ $('Document row').item.json.issues }}\n\nSupplier: {{ $('Document row').item.json.supplier_name }}\nNumber: {{ $('Document row').item.json.invoice_number }}\nDate: {{ $('Document row').item.json.invoice_date }}\nTotal: {{ $('Document row').item.json.total }} {{ $('Document row').item.json.currency }}\n\nFile: {{ $('Document row').item.json.drive_link }}\nSheet: {{ ${S}.googleSheetUrl }}`,
  }, [1660, 0]), { output: 0 });
  save("06-ai-document-processing", wf);
}

// ===================================================================================== 7. security monitoring
{
  const wf = new Workflow("AI Security Monitoring | Ranime Jemal Agency");
  wf.note("## AI Security Monitoring\nReceives alerts from Wazuh, Grafana/Alertmanager, AWS GuardDuty (via EventBridge) or any tool that can POST JSON. Repeats are muted for 30 minutes, public IPs are checked on VirusTotal, the AI triages each alert, everything is logged, and high or critical alerts are emailed at once. A summary is emailed every Monday.\n1. Fill in **Settings**. 2. Create a Header Auth credential for the webhook and give the same header to your alert sources. 3. Make a Google Sheet with an **Incidents** tab (see `incidents-sheet.csv`). 4. Connect OpenAI, VirusTotal, Google Sheets and Gmail. 5. Activate.", [-560, -480], 600, 320);
  const hook = webhook(wf, "Security alert", "security-alert", [-560, 0], { headerAuth: true });
  const weekly = schedule(wf, "Every Monday at 8:00", "0 8 * * 1", [-560, 500]);
  const set = settings(wf, [
    ["organisationName", "Your company"],
    ["alertEmail", "security@yourcompany.com"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ["muteRepeatsMinutes", 30, "number"],
    ["senderName", "Security monitor"],
    ...COMMON_AI,
  ], [-320, 250]);
  wf.connect(hook, set);
  wf.connect(weekly, set);
  const r = route(wf, [["Alert", ["Security alert"]], ["Weekly summary", ["Every Monday at 8:00"]]], [-100, 250]);
  wf.connect(set, r);

  const norm = code(wf, "Normalize and mute repeats", [L.normalizeAlerts, L.dedupeAlerts], `
const s = ${S};
const now = new Date();
const alerts = normalizeAlerts($('Security alert').first().json.body, now.toISOString());
const fresh = dedupeAlerts(alerts, $getWorkflowStaticData('global'), now.getTime(), Number(s.muteRepeatsMinutes));
const isPublic = (ip) => !!ip && !/^(10\\.|127\\.|169\\.254\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[01])\\.)/.test(ip);
return fresh.map((a) => ({ json: { ...a, public_ip: isPublic(a.ip) }, pairedItem: { item: 0 } }));`, [160, 0]);
  wf.connect(r, norm, { output: 0 });
  const hasIp = ifNode(wf, "Public IP?", condition("={{ $json.public_ip }}", "true", "", "boolean"), [380, 0]);
  wf.connect(norm, hasIp);
  const vt = wf.add("IP reputation (VirusTotal)", "n8n-nodes-base.httpRequest", 4.2, {
    url: "=https://www.virustotal.com/api/v3/ip_addresses/{{ $json.ip }}",
    authentication: "predefinedCredentialType",
    nodeCredentialType: "virusTotalApi",
    options: { timeout: 20000 },
  }, [600, -100], { onError: "continueRegularOutput" });
  wf.connect(hasIp, vt, { output: 0 });
  const merge = wf.add("All alerts", "n8n-nodes-base.merge", 3, {}, [820, 0]);
  wf.connect(vt, merge, { input: 0 });
  wf.connect(hasIp, merge, { output: 1, input: 1 });
  const prep = codeEach(wf, "Prepare triage", [L.ipReputation, L.buildTriageRequest], `
const s = ${S};
const alert = $('Normalize and mute repeats').item.json;
const reputation = ipReputation($json);
return { json: { ...alert, reputation, request: buildTriageRequest(alert, reputation, s) } };`, [1040, 0]);
  wf.connect(merge, prep);
  const triage = openAi(wf, "Triage with AI", [1260, 0]);
  wf.connect(prep, triage);
  const inc = code(wf, "Incident row", [L.readAiJson], `
const prepared = $('Prepare triage').all();
return $input.all().map((item, i) => {
  const a = prepared[i].json;
  let t;
  try { t = readAiJson(item.json); } catch (e) { t = { severity: a.severity, summary: 'AI triage failed: ' + e.message, recommended_actions: [] }; }
  const order = ['low', 'medium', 'high', 'critical'];
  // Keep the higher of the tool's severity and the AI's, so a confused answer never hides a critical alert.
  const severity = order[Math.max(order.indexOf(a.severity), order.indexOf(t.severity))] || a.severity;
  return { json: {
    received_at: a.received_at, source: a.source, title: a.title, host: a.host, ip: a.ip, rule: a.rule,
    severity, ai_summary: t.summary || '', likely_cause: t.likely_cause || '', false_positive_likelihood: t.false_positive_likelihood || '',
    recommended_actions: (t.recommended_actions || []).join(' | '),
    ip_malicious_votes: a.reputation ? a.reputation.malicious : '', ip_country: a.reputation ? a.reputation.country : '',
    details: a.details, status: 'open',
  }, pairedItem: { item: i } };
});`, [1480, 0]);
  wf.connect(triage, inc);
  const logInc = sheetsAppend(wf, "Log incident", "Incidents", [1700, 0]);
  wf.connect(inc, logInc);
  const urgent = ifNode(wf, "High or critical?", condition("={{ ['high', 'critical'].includes($('Incident row').item.json.severity) }}", "true", "", "boolean"), [1920, 0]);
  wf.connect(logInc, urgent);
  const I = "$('Incident row').item.json";
  wf.connect(urgent, gmailSend(wf, "Email the alert", {
    to: `={{ ${S}.alertEmail }}`,
    subject: `=[{{ ${I}.severity.toUpperCase() }}] {{ ${I}.title }} on {{ ${I}.host || 'unknown host' }}`,
    message: `={{ ${I}.ai_summary }}\n\nLikely cause: {{ ${I}.likely_cause }}\nFalse positive likelihood: {{ ${I}.false_positive_likelihood }}\n\nRecommended actions:\n{{ ${I}.recommended_actions.split(' | ').map((a) => '- ' + a).join('\\n') }}\n\nHost: {{ ${I}.host }}\nIP: {{ ${I}.ip }} {{ ${I}.ip_malicious_votes !== '' ? '(' + ${I}.ip_malicious_votes + ' VirusTotal engines flag it as malicious)' : '' }}\nSource: {{ ${I}.source }} / rule {{ ${I}.rule }}\n\nDetails:\n{{ ${I}.details }}`,
  }, [2140, -100]), { output: 0 });

  const readInc = sheetsRead(wf, "Read incidents", "Incidents", [160, 500]);
  wf.connect(r, readInc, { output: 1 });
  const stats = code(wf, "Weekly numbers", [L.weeklyStats], `
const rows = $input.all().map((i) => i.json).filter((r) => r.received_at);
const st = weeklyStats(rows, new Date().toISOString());
const sev = Object.entries(st.by_severity).map(([k, v]) => k + ': ' + v).join(', ') || 'none';
const text = [
  'Alerts in the last 7 days: ' + st.total + ' (' + sev + ')',
  '', 'Most affected hosts: ' + (st.top_hosts.join(', ') || 'none'),
  'Most frequent alerts: ' + (st.top_alerts.join(', ') || 'none'),
  '', 'High or critical alerts still open:', ...(st.open_critical.length ? st.open_critical.map((x) => '- ' + x) : ['- none']),
].join('\\n');
return [{ json: { total: st.total, text }, pairedItem: { item: 0 } }];`, [380, 500]);
  wf.connect(readInc, stats);
  wf.connect(stats, gmailSend(wf, "Email weekly summary", {
    to: `={{ ${S}.alertEmail }}`,
    subject: `=Weekly security summary: {{ $json.total }} alerts | {{ ${S}.organisationName }}`,
    message: `={{ $json.text }}\n\nFull log: {{ ${S}.googleSheetUrl }}`,
  }, [600, 500]));
  save("07-ai-security-monitoring-workflows", wf);
}

// ===================================================================== catalog automations (08 to 18)
// The other listings in the marketplace catalog. 17 (security alert triage and reporting) is covered by 07.

function gmailInbox(wf, name, q, position) {
  return wf.add(name, "n8n-nodes-base.gmailTrigger", 1.2, {
    pollTimes: { item: [{ mode: "everyX", value: 5, unit: "minutes" }] },
    simple: false,
    filters: { q },
    options: {},
  }, position);
}

function draftInThread(wf, name, { to, subject, message, threadId }, position) {
  return wf.add(name, "n8n-nodes-base.gmail", 2.1, {
    resource: "draft", subject, emailType: "text", message, options: { sendTo: to, threadId },
  }, position);
}

// ------------------------------------------------------------------------------- 08. lead management assistant
{
  const wf = new Workflow("AI Lead Management Assistant | Ranime Jemal Agency");
  wf.note("## AI Lead Management Assistant\nSorts every enquiry that reaches your inbox or website form: category, priority and a one-line summary, logged in Google Sheets, with a reply drafted in Gmail (in the same thread) for you to check and send. High-priority enquiries are emailed to the team.\n1. Fill in **Settings**. 2. Make a sheet with an **Enquiries** tab (`enquiries-sheet.csv`). 3. Connect Gmail, Google Sheets and OpenAI. 4. Activate.", [-560, -440], 540, 280);
  const mail = gmailInbox(wf, "New enquiry email", "in:inbox -from:me -category:promotions -category:social -category:updates", [-560, -60]);
  const hook = webhook(wf, "Website form webhook", "enquiry", [-560, 160]);
  const set = settings(wf, [
    ["businessName", "Your business name"],
    ["businessDescription", "What you sell, in one or two sentences."],
    ["categories", "quote request, product question, partnership, support, job application, other"],
    ["senderName", "Your name, Your business"],
    ["teamEmail", "you@yourbusiness.com"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ...COMMON_AI,
  ], [-320, 50]);
  wf.connect(mail, set);
  wf.connect(hook, set);
  const read = code(wf, "Read enquiry", [L.emailEnquiry, L.normalizeLead, L.buildEnquiryRequest], `
const s = ${S};
const fromEmail = $('New enquiry email').isExecuted;
return $input.all().map((item, i) => {
  let e;
  if (fromEmail) e = { ...emailEnquiry(item.json), source: 'email' };
  else {
    const l = normalizeLead(item.json, 'website form', new Date().toISOString());
    e = { message_id: '', thread_id: '', email: l.email, name: l.name, subject: 'Website enquiry' + (l.company ? ' from ' + l.company : ''),
      message: l.message, received_at: l.received_at, source: 'website form' };
  }
  return { json: { ...e, request: buildEnquiryRequest(e, s) }, pairedItem: { item: i } };
}).filter((i) => i.json.email);`, [-100, 50]);
  wf.connect(set, read);
  const ai = openAi(wf, "Sort with AI", [120, 50]);
  wf.connect(read, ai);
  const row = code(wf, "Enquiry row", [L.readAiJson], `
const src = $('Read enquiry').all();
return $input.all().map((item, i) => {
  const e = src[i].json;
  const ai = readAiJson(item.json);
  return { json: {
    received_at: e.received_at, source: e.source, name: e.name, email: e.email, subject: e.subject, message: e.message,
    category: ai.category || 'other', priority: ['high', 'normal', 'low'].includes(ai.priority) ? ai.priority : 'normal',
    summary: ai.summary || '', is_spam: ai.is_spam === true, status: ai.is_spam === true ? 'spam' : 'reply drafted',
    thread_id: e.thread_id, reply: ai.reply || '',
  }, pairedItem: { item: i } };
});`, [340, 50]);
  wf.connect(ai, row);
  const log = sheetsAppend(wf, "Log enquiry", "Enquiries", [560, 50]);
  wf.connect(row, log);
  const notSpam = ifNode(wf, "Not spam?", condition("={{ $('Enquiry row').item.json.is_spam }}", "false", "", "boolean"), [780, 50]);
  wf.connect(log, notSpam);
  const E = "$('Enquiry row').item.json";
  const draft = draftInThread(wf, "Draft the reply", {
    to: `={{ ${E}.email }}`, subject: `=Re: {{ ${E}.subject }}`, message: `={{ ${E}.reply }}`, threadId: `={{ ${E}.thread_id }}`,
  }, [1000, -40]);
  wf.connect(notSpam, draft, { output: 0 });
  const high = ifNode(wf, "High priority?", condition(`={{ ${E}.priority }}`, "equals", "high"), [1220, -40]);
  wf.connect(draft, high);
  wf.connect(high, gmailSend(wf, "Alert the team", {
    to: `={{ ${S}.teamEmail }}`,
    subject: `=High priority enquiry: {{ ${E}.summary }}`,
    message: `=From: {{ ${E}.name }} <{{ ${E}.email }}>\nCategory: {{ ${E}.category }}\nSubject: {{ ${E}.subject }}\n\n{{ ${E}.message }}\n\nA reply is waiting in Gmail drafts.`,
  }, [1440, -100]), { output: 0 });
  save("08-ai-lead-management-assistant", wf);
}

// ---------------------------------------------------------------------------- 09. lead enrichment & qualification
{
  const wf = new Workflow("Lead Enrichment & Qualification | Ranime Jemal Agency");
  wf.note("## Lead Enrichment & Qualification\nFor each new lead: reads the company website (from the website field or the email domain), has the AI describe the company and score the fit against your ideal customer, logs it, and emails qualified leads to the right salesperson.\n1. Fill in **Settings** (routing rules: one per line, `keyword = owner@email`).\n2. Make a sheet with a **Leads** tab (`enriched-leads-sheet.csv`). 3. Connect OpenAI, Google Sheets and Gmail. 4. Activate; send leads to the webhook or share the form.", [-560, -460], 560, 300);
  const hook = webhook(wf, "New lead webhook", "enrich-lead", [-560, -60]);
  const form = wf.add("Lead form", "n8n-nodes-base.formTrigger", 2.2, {
    formTitle: "Tell us about your company",
    formFields: { values: [
      { fieldLabel: "Name", requiredField: true },
      { fieldLabel: "Email", fieldType: "email", requiredField: true },
      { fieldLabel: "Company" },
      { fieldLabel: "Website" },
      { fieldLabel: "How can we help?", fieldType: "textarea" },
    ] },
    options: { appendAttribution: false },
  }, [-560, 140], { webhookId: uid("hook") });
  const set = settings(wf, [
    ["businessName", "Your business name"],
    ["idealCustomer", "Industry, company size, region and need of your best customers."],
    ["minFitScore", 60, "number"],
    ["routingRules", "real estate = alice@yourbusiness.com\nretail = bob@yourbusiness.com"],
    ["defaultOwner", "sales@yourbusiness.com"],
    ["senderName", "Lead assistant"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ...COMMON_AI,
  ], [-320, 40]);
  wf.connect(hook, set);
  wf.connect(form, set);
  const lead = code(wf, "Lead", [L.normalizeLead, L.companyDomain], `
const source = $('Lead form').isExecuted ? 'form' : 'webhook';
return $input.all().map((item, i) => {
  const l = normalizeLead(item.json, source, new Date().toISOString());
  const b = item.json.body || item.json;
  const website = b.website || b.Website || b.site || b.url || '';
  return { json: { ...l, domain: companyDomain(l.email, website) }, pairedItem: { item: i } };
}).filter((i) => i.json.valid);`, [-100, 40]);
  wf.connect(set, lead);
  const hasSite = ifNode(wf, "Has a company website?", condition("={{ $json.domain }}", "notEmpty"), [120, 40]);
  wf.connect(lead, hasSite);
  const fetchSite = wf.add("Read company website", "n8n-nodes-base.httpRequest", 4.2, {
    url: "=https://{{ $json.domain }}",
    options: { response: { response: { responseFormat: "text" } }, timeout: 15000 },
  }, [340, -40], { onError: "continueRegularOutput" });
  wf.connect(hasSite, fetchSite, { output: 0 });
  const merge = wf.add("All leads", "n8n-nodes-base.merge", 3, {}, [560, 40]);
  wf.connect(fetchSite, merge, { input: 0 });
  wf.connect(hasSite, merge, { output: 1, input: 1 });
  const prep = codeEach(wf, "Prepare enrichment", [L.htmlToText, L.buildEnrichRequest], `
const s = ${S};
const lead = $('Lead').item.json;
const siteText = typeof $json.data === 'string' ? htmlToText($json.data) : '';
return { json: { ...lead, website_read: siteText ? 'yes' : 'no', request: buildEnrichRequest(lead, siteText, s) } };`, [780, 40]);
  wf.connect(merge, prep);
  const ai = openAi(wf, "Enrich and score with AI", [1000, 40]);
  wf.connect(prep, ai);
  const row = code(wf, "Enriched lead", [L.readAiJson, L.routeLead], `
const s = ${S};
const src = $('Prepare enrichment').all();
return $input.all().map((item, i) => {
  const l = src[i].json;
  const ai = readAiJson(item.json);
  const score = Math.max(0, Math.min(100, Number(ai.fit_score) || 0));
  const qualified = score >= Number(s.minFitScore);
  return { json: {
    received_at: l.received_at, source: l.source, name: l.name, email: l.email, phone: l.phone, company: ai.company_name || l.company,
    domain: l.domain, website_read: l.website_read, industry: ai.industry || '', company_size: ai.company_size || 'unknown',
    what_they_do: ai.what_they_do || '', fit_score: score, fit_reason: ai.fit_reason || '', confidence: ai.confidence || 'low',
    qualified: qualified ? 'yes' : 'no', owner: qualified ? routeLead(ai, s.routingRules, s.defaultOwner) : '', message: l.message,
  }, pairedItem: { item: i } };
});`, [1220, 40]);
  wf.connect(ai, row);
  const log = sheetsAppend(wf, "Log lead", "Leads", [1440, 40]);
  wf.connect(row, log);
  const R = "$('Enriched lead').item.json";
  const isQualified = ifNode(wf, "Qualified?", condition(`={{ ${R}.qualified }}`, "equals", "yes"), [1660, 40]);
  wf.connect(log, isQualified);
  wf.connect(isQualified, gmailSend(wf, "Send to salesperson", {
    to: `={{ ${R}.owner }}`,
    subject: `=Qualified lead ({{ ${R}.fit_score }}/100): {{ ${R}.company || ${R}.name }}`,
    message: `={{ ${R}.name }} <{{ ${R}.email }}> {{ ${R}.phone }}\nCompany: {{ ${R}.company }} ({{ ${R}.domain || 'no website' }})\nIndustry: {{ ${R}.industry }}, size: {{ ${R}.company_size }}\nWhat they do: {{ ${R}.what_they_do }}\n\nFit {{ ${R}.fit_score }}/100: {{ ${R}.fit_reason }}\n\nTheir message:\n{{ ${R}.message }}`,
  }, [1880, -40]), { output: 0 });
  save("09-lead-enrichment-qualification", wf);
}

// ------------------------------------------------------------------------------- 10. social media content scheduler
{
  const wf = new Workflow("Social Media Content Scheduler | Ranime Jemal Agency");
  wf.note("## Social Media Content Scheduler\nPublishes the posts you write in a Google Sheet at the time you choose, to Facebook, Instagram and LinkedIn (X optional), and writes the result back.\n1. Fill in **Settings**. 2. Make a sheet with a **Schedule** tab (`schedule-sheet.csv`): one row per post, `status` = scheduled. 3. Connect Google Sheets, Facebook Graph API and LinkedIn; disable networks you do not use. 4. Activate. One post is published per hourly run.", [-560, -420], 540, 260);
  const hourly = schedule(wf, "Every hour", "15 * * * *", [-560, 200]);
  const set = settings(wf, [
    ["facebookPageId", "YOUR_FACEBOOK_PAGE_ID"],
    ["instagramAccountId", "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID"],
    ["linkedinOrganizationId", "YOUR_LINKEDIN_ORGANIZATION_ID"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
  ], [-320, 200]);
  wf.connect(hourly, set);
  const read = sheetsRead(wf, "Read schedule", "Schedule", [-100, 200]);
  wf.connect(set, read);
  publishBranch(wf, read, { status: "scheduled", tab: "Schedule", y: 200 });
  save("10-social-media-content-scheduler", wf);
}

// ------------------------------------------------------------------------------- 11. review & reputation monitor
{
  const wf = new Workflow("Review & Reputation Monitor | Ranime Jemal Agency");
  wf.note("## Review & Reputation Monitor\nEvery morning checks your Google Business reviews (Google Places API), finds the new ones, has the AI rate the sentiment and draft a public reply, logs them, emails you at once about low ratings, and sends a short digest.\nGoogle returns the 5 most relevant reviews per check, so very busy places may miss some.\n1. Fill in **Settings** (Place ID: Google's Place ID Finder). 2. Create a Header Auth credential: name `X-Goog-Api-Key`, value = a Google Cloud API key with the Places API (New) enabled. 3. Make a sheet with a **Reviews** tab (`reviews-sheet.csv`). 4. Connect OpenAI, Google Sheets and Gmail. 5. Activate.", [-560, -480], 580, 320);
  const daily = schedule(wf, "Every morning", "40 8 * * *", [-560, 100]);
  const set = settings(wf, [
    ["businessName", "Your business name"],
    ["googlePlaceId", "YOUR_GOOGLE_PLACE_ID"],
    ["replyTone", "warm, professional, short"],
    ["contactEmail", "contact@yourbusiness.com"],
    ["alertEmail", "you@yourbusiness.com"],
    ["lowRating", 3, "number"],
    ["senderName", "Review monitor"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ...COMMON_AI,
  ], [-320, 100]);
  wf.connect(daily, set);
  const places = wf.add("Get Google reviews", "n8n-nodes-base.httpRequest", 4.2, {
    url: `=https://places.googleapis.com/v1/places/{{ ${S}.googlePlaceId }}`,
    authentication: "genericCredentialType",
    genericAuthType: "httpHeaderAuth",
    sendHeaders: true,
    headerParameters: { parameters: [{ name: "X-Goog-FieldMask", value: "displayName,rating,userRatingCount,reviews" }] },
    options: { timeout: 20000 },
  }, [-100, 100], { retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 });
  wf.connect(set, places);
  const fresh = code(wf, "New reviews", [L.newReviews, L.buildReviewRequest], `
const s = ${S};
const place = $input.first().json;
const reviews = newReviews(place.reviews || [], $getWorkflowStaticData('global'));
return reviews.map((r) => ({ json: { ...r, place_rating: place.rating || '', place_reviews: place.userRatingCount || '', request: buildReviewRequest(r, s) }, pairedItem: { item: 0 } }));`, [120, 100]);
  wf.connect(places, fresh);
  const ai = openAi(wf, "Analyse with AI", [340, 100]);
  wf.connect(fresh, ai);
  const row = code(wf, "Review row", [L.readAiJson], `
const src = $('New reviews').all();
return $input.all().map((item, i) => {
  const r = src[i].json;
  const ai = readAiJson(item.json);
  return { json: {
    checked_at: new Date().toISOString(), review_id: r.review_id, published_at: r.published_at, rating: r.rating, author: r.author, text: r.text,
    sentiment: ai.sentiment || '', summary: ai.summary || '', topics: (ai.topics || []).join(', '), suggested_reply: ai.reply || '',
    place_rating: r.place_rating, status: 'to reply',
  }, pairedItem: { item: i } };
});`, [560, 100]);
  wf.connect(ai, row);
  const log = sheetsAppend(wf, "Log review", "Reviews", [780, 100]);
  wf.connect(row, log);
  const V = "$('Review row').item.json";
  const low = ifNode(wf, "Low rating?", condition(`={{ ${V}.rating <= ${S}.lowRating }}`, "true", "", "boolean"), [1000, 100]);
  wf.connect(log, low);
  wf.connect(low, gmailSend(wf, "Alert about low rating", {
    to: `={{ ${S}.alertEmail }}`,
    subject: `={{ ${V}.rating }}-star review from {{ ${V}.author }}: {{ ${V}.summary }}`,
    message: `=New {{ ${V}.rating }}-star review on Google ({{ ${V}.sentiment }}):\n\n"{{ ${V}.text }}"\n\nSuggested reply (check before posting):\n{{ ${V}.suggested_reply }}\n\nReply on Google Business Profile.`,
  }, [1220, 0]), { output: 0 });
  const digest = code(wf, "Daily digest", [], `
const rows = $('Review row').all().map((i) => i.json);
const lines = rows.map((r) => '- ' + r.rating + '/5 ' + r.author + ': ' + r.summary).join('\\n');
return [{ json: { count: rows.length, rating: rows[0] ? rows[0].place_rating : '', lines }, pairedItem: rows.map((_, i) => ({ item: i })) }];`, [1000, 300], { executeOnce: true });
  wf.connect(log, digest);
  wf.connect(digest, gmailSend(wf, "Email the digest", {
    to: `={{ ${S}.alertEmail }}`,
    subject: `={{ $json.count }} new Google review(s) for {{ ${S}.businessName }}`,
    message: `=Average rating: {{ $json.rating }}\n\n{{ $json.lines }}\n\nAll reviews and suggested replies: {{ ${S}.googleSheetUrl }}`,
  }, [1220, 300]));
  save("11-review-reputation-monitor", wf);
}

// ------------------------------------------------------------------------------- 12. support ticket triage
{
  const wf = new Workflow("Customer Support Ticket Triage | Ranime Jemal Agency");
  wf.note("## Customer Support Ticket Triage\nEvery support email is categorized (category, urgency, sentiment, language), summarized and logged as a ticket, with a suggested reply drafted in the same Gmail thread. Urgent and high-urgency tickets are emailed to the person on duty.\n1. Fill in **Settings** (your real policies make the drafts better). 2. Make a sheet with a **Tickets** tab (`tickets-sheet.csv`). 3. Connect Gmail (support inbox), Google Sheets and OpenAI. 4. Activate.", [-560, -420], 540, 280);
  const mail = gmailInbox(wf, "New support email", "in:inbox -from:me -category:promotions -category:social", [-560, 60]);
  const set = settings(wf, [
    ["businessName", "Your business name"],
    ["businessDescription", "What you sell, in one or two sentences."],
    ["categories", "order status, delivery problem, refund or return, billing, technical problem, account, product question, complaint, other"],
    ["policies", "Returns within 30 days. Refunds in 5 business days. Delivery 2-4 business days."],
    ["senderName", "Support team, Your business"],
    ["urgentEmail", "oncall@yourbusiness.com"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ...COMMON_AI,
  ], [-320, 60]);
  wf.connect(mail, set);
  const read = code(wf, "Read ticket", [L.emailEnquiry, L.buildTicketRequest], `
const s = ${S};
return $input.all().map((item, i) => {
  const t = emailEnquiry(item.json);
  return { json: { ...t, request: buildTicketRequest(t, s) }, pairedItem: { item: i } };
}).filter((i) => i.json.email);`, [-100, 60]);
  wf.connect(set, read);
  const ai = openAi(wf, "Triage with AI", [120, 60]);
  wf.connect(read, ai);
  const row = code(wf, "Ticket row", [L.readAiJson], `
const src = $('Read ticket').all();
return $input.all().map((item, i) => {
  const t = src[i].json;
  const ai = readAiJson(item.json);
  return { json: {
    ticket_id: t.message_id, received_at: t.received_at, name: t.name, email: t.email, subject: t.subject,
    category: ai.category || 'other', urgency: ['urgent', 'high', 'normal', 'low'].includes(ai.urgency) ? ai.urgency : 'normal',
    sentiment: ai.sentiment || '', language: ai.language || '', summary: ai.summary || '', status: 'new', thread_id: t.thread_id,
    suggested_reply: ai.suggested_reply || '', message: t.message,
  }, pairedItem: { item: i } };
});`, [340, 60]);
  wf.connect(ai, row);
  const log = sheetsAppend(wf, "Log ticket", "Tickets", [560, 60]);
  wf.connect(row, log);
  const T = "$('Ticket row').item.json";
  const draft = draftInThread(wf, "Draft the reply", {
    to: `={{ ${T}.email }}`, subject: `=Re: {{ ${T}.subject }}`, message: `={{ ${T}.suggested_reply }}`, threadId: `={{ ${T}.thread_id }}`,
  }, [780, 60]);
  wf.connect(log, draft);
  const urgent = ifNode(wf, "Urgent?", condition(`={{ ['urgent', 'high'].includes(${T}.urgency) }}`, "true", "", "boolean"), [1000, 60]);
  wf.connect(draft, urgent);
  wf.connect(urgent, gmailSend(wf, "Alert the person on duty", {
    to: `={{ ${S}.urgentEmail }}`,
    subject: `=[{{ ${T}.urgency.toUpperCase() }}] {{ ${T}.category }}: {{ ${T}.summary }}`,
    message: `=From: {{ ${T}.name }} <{{ ${T}.email }}> ({{ ${T}.sentiment }})\nSubject: {{ ${T}.subject }}\n\n{{ ${T}.message }}\n\nA suggested reply is in Gmail drafts.`,
  }, [1220, 0]), { output: 0 });
  save("12-customer-support-ticket-triage", wf);
}

// ------------------------------------------------------------------------------- 13. e-commerce order & inventory sync
{
  const wf = new Workflow("E-commerce Order & Inventory Sync | Ranime Jemal Agency");
  wf.note("## E-commerce Order & Inventory Sync\nEach new Shopify or WooCommerce order is logged, the stock of every SKU sold is reduced in your Google Sheet inventory, and you get an email when a product reaches its low-stock threshold or an order contains a SKU that is not in the sheet.\n1. Fill in **Settings**. 2. Make a sheet with **Inventory** and **Orders** tabs (CSV files). 3. Connect Shopify (access token) and/or WooCommerce; disable the trigger you do not use. 4. Connect Google Sheets and Gmail. 5. Activate.", [-560, -460], 560, 300);
  const shop = wf.add("New Shopify order", "n8n-nodes-base.shopifyTrigger", 1, { authentication: "accessToken", topic: "orders/create" }, [-560, 0], { webhookId: uid("hook") });
  const woo = wf.add("New WooCommerce order", "n8n-nodes-base.wooCommerceTrigger", 1, { event: "order.created" }, [-560, 200], { webhookId: uid("hook") });
  const set = settings(wf, [
    ["alertEmail", "you@yourstore.com"],
    ["senderName", "Inventory assistant"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
  ], [-320, 100]);
  wf.connect(shop, set);
  wf.connect(woo, set);
  const order = code(wf, "Order", [L.orderLines, L.orderSummary], `
const source = $('New Shopify order').isExecuted ? 'shopify' : 'woocommerce';
return $input.all().map((item, i) => ({ json: { ...orderSummary(item.json, source), lines: orderLines(item.json) }, pairedItem: { item: i } }));`, [-100, 100]);
  wf.connect(set, order);
  const logOrder = sheetsAppend(wf, "Log order", "Orders", [120, 100]);
  wf.connect(order, logOrder);
  const inv = sheetsRead(wf, "Read inventory", "Inventory", [340, 100], { executeOnce: true });
  wf.connect(logOrder, inv);
  const changes = code(wf, "Stock changes", [L.applyOrder], `
const lines = $('Order').all().flatMap((o) => o.json.lines);
const rows = $input.all().map((i) => i.json).filter((r) => r.sku);
return applyOrder(rows, lines, new Date().toISOString()).updates.map((u) => ({ json: u, pairedItem: { item: 0 } }));`, [560, 0]);
  wf.connect(inv, changes);
  wf.connect(changes, sheetsUpdate(wf, "Update stock", "Inventory", "sku", [780, 0]));
  const alertNeeded = code(wf, "Low stock or unknown SKUs", [L.applyOrder], `
const orders = $('Order').all().map((o) => o.json);
const lines = orders.flatMap((o) => o.lines);
const rows = $input.all().map((i) => i.json).filter((r) => r.sku);
const r = applyOrder(rows, lines, new Date().toISOString());
if (!r.low.length && !r.unknown.length) return [];
const text = [
  r.low.length ? 'Low stock:\\n' + r.low.map((l) => '- ' + l.sku + ' ' + (l.product || '') + ': ' + l.stock + ' left (threshold ' + l.threshold + ')').join('\\n') : '',
  r.unknown.length ? 'Sold but not in the inventory sheet: ' + r.unknown.join(', ') : '',
].filter(Boolean).join('\\n\\n');
return [{ json: { order_id: orders.map((o) => o.order_id).join(', '), low_count: r.low.length, unknown_count: r.unknown.length, text }, pairedItem: { item: 0 } }];`, [560, 220]);
  wf.connect(inv, alertNeeded);
  wf.connect(alertNeeded, gmailSend(wf, "Email stock alert", {
    to: `={{ ${S}.alertEmail }}`,
    subject: "=Stock alert after order {{ $json.order_id }}",
    message: `={{ $json.text }}\n\nInventory: {{ ${S}.googleSheetUrl }}`,
  }, [780, 220]));
  save("13-ecommerce-order-inventory-sync", wf);
}

// ------------------------------------------------------------------------------- 14. abandoned cart recovery
{
  const wf = new Workflow("Abandoned Cart Recovery | Ranime Jemal Agency");
  wf.note("## Abandoned Cart Recovery (Shopify)\nSaves every checkout, marks it recovered when the order is placed, and every hour emails customers who left items behind: a first reminder after `firstDelayHours`, then every `repeatHours`, up to `maxReminders`. The AI writes each email from the cart contents; the discount code (optional) is only offered from the second reminder.\nOnly email customers who agreed to marketing emails where the law requires it.\n1. Fill in **Settings**. 2. Make a sheet with a **Carts** tab (`carts-sheet.csv`). 3. Connect Shopify (access token), Google Sheets, Gmail and OpenAI. 4. Activate.", [-560, -500], 580, 320);
  const created = wf.add("Checkout created", "n8n-nodes-base.shopifyTrigger", 1, { authentication: "accessToken", topic: "checkouts/create" }, [-560, -40], { webhookId: uid("hook") });
  const updated = wf.add("Checkout updated", "n8n-nodes-base.shopifyTrigger", 1, { authentication: "accessToken", topic: "checkouts/update" }, [-560, 140], { webhookId: uid("hook") });
  const ordered = wf.add("Order placed", "n8n-nodes-base.shopifyTrigger", 1, { authentication: "accessToken", topic: "orders/create" }, [-560, 320], { webhookId: uid("hook") });
  const hourly = schedule(wf, "Every hour", "20 * * * *", [-560, 520]);
  const set = settings(wf, [
    ["storeName", "Your store"],
    ["brandVoice", "friendly and simple"],
    ["language", "English"],
    ["firstDelayHours", 1, "number"],
    ["repeatHours", 24, "number"],
    ["maxReminders", 2, "number"],
    ["discountCode", ""],
    ["discountText", "10% off your order"],
    ["senderName", "Your store"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ...COMMON_AI,
  ], [-320, 240]);
  for (const t of [created, updated, ordered, hourly]) wf.connect(t, set);
  const r = route(wf, [["Checkout", [created, updated]], ["Order", [ordered]], ["Reminders", [hourly]]], [-100, 240]);
  wf.connect(set, r);

  const cart = code(wf, "Cart row", [L.checkoutRow], `
return $input.all().map((item, i) => ({ json: checkoutRow(item.json), pairedItem: { item: i } })).filter((i) => i.json.checkout_id);`, [160, 0]);
  wf.connect(r, cart, { output: 0 });
  wf.connect(cart, wf.add("Save cart", "n8n-nodes-base.googleSheets", 4.5, {
    operation: "appendOrUpdate", documentId: sheetDoc, sheetName: sheetTab("Carts"),
    columns: { mappingMode: "autoMapInputData", value: {}, matchingColumns: ["checkout_id"], schema: [] },
    options: { handlingExtraData: "ignoreIt" },
  }, [380, 0]));

  const readO = sheetsRead(wf, "Read carts (order)", "Carts", [160, 240], { executeOnce: true });
  wf.connect(r, readO, { output: 1 });
  const recovered = code(wf, "Recovered carts", [], `
const orders = $('Order placed').all().map((o) => o.json);
return $input.all()
  .map((item, i) => ({ row: item.json, i }))
  .filter(({ row }) => row.checkout_id && String(row.status || 'open').toLowerCase() === 'open')
  .map(({ row, i }) => {
    const order = orders.find((o) => (o.checkout_token && String(o.checkout_token) === String(row.checkout_id)) || (o.email && row.email && o.email.toLowerCase() === String(row.email).toLowerCase()));
    return order ? { json: { checkout_id: row.checkout_id, status: 'recovered', recovered_order: String(order.name || order.id) }, pairedItem: { item: i } } : null;
  })
  .filter(Boolean);`, [380, 240]);
  wf.connect(readO, recovered);
  wf.connect(recovered, sheetsUpdate(wf, "Mark recovered", "Carts", "checkout_id", [600, 240]));

  const readR = sheetsRead(wf, "Read carts", "Carts", [160, 480]);
  wf.connect(r, readR, { output: 2 });
  const due = code(wf, "Carts to remind", [L.dueCartReminders, L.buildCartReminderRequest], `
const s = ${S};
const input = $input.all();
const index = new Map(input.map((it, i) => [it.json, i]));
const rows = input.map((i) => i.json).filter((r) => r.checkout_id);
return dueCartReminders(rows, new Date().toISOString(), Number(s.firstDelayHours), Number(s.repeatHours), Number(s.maxReminders)).map((row) => {
  const n = Number(row.reminders || 0) + 1;
  return { json: { ...row, reminder_number: n, request: buildCartReminderRequest(row, n, s) }, pairedItem: { item: index.get(row) } };
});`, [380, 480]);
  wf.connect(readR, due);
  const ai = openAi(wf, "Write reminder with AI", [600, 480]);
  wf.connect(due, ai);
  const mail = code(wf, "Reminder email", [L.readAiJson], `
const src = $('Carts to remind').all();
return $input.all().map((item, i) => {
  const c = src[i].json;
  const ai = readAiJson(item.json);
  return { json: { checkout_id: c.checkout_id, email: c.email, reminder_number: c.reminder_number, subject: ai.subject || 'You left something in your cart',
    body: (ai.body || '') + '\\n\\nComplete your order: ' + c.recovery_url }, pairedItem: { item: i } };
});`, [820, 480]);
  wf.connect(ai, mail);
  const send = gmailSend(wf, "Send reminder", { to: "={{ $json.email }}", subject: "={{ $json.subject }}", message: "={{ $json.body }}" }, [1040, 480]);
  wf.connect(mail, send);
  const upd = code(wf, "Reminder sent", [], `
return $input.all().map((_, i) => {
  const m = $('Reminder email').all()[i].json;
  return { json: { checkout_id: m.checkout_id, status: 'open', reminders: m.reminder_number, last_reminder_at: new Date().toISOString() }, pairedItem: { item: i } };
});`, [1260, 480]);
  wf.connect(send, upd);
  wf.connect(upd, sheetsUpdate(wf, "Record reminder", "Carts", "checkout_id", [1480, 480]));
  save("14-abandoned-cart-recovery", wf);
}

// ------------------------------------------------------------------------------- 15. meeting notes & task assistant
{
  const wf = new Workflow("Meeting Notes & Task Assistant | Ranime Jemal Agency");
  wf.note("## Meeting Notes & Task Assistant\nPaste a transcript or rough notes in the form (or send them to the webhook from your recorder), and the AI writes the summary, decisions, action items with owners and due dates, and open questions. The notes are emailed to the attendees and every action item is added to a **Tasks** sheet.\n1. Fill in **Settings**. 2. Make a sheet with a **Tasks** tab (`tasks-sheet.csv`). 3. Connect OpenAI, Gmail and Google Sheets. 4. Activate and share the form.", [-560, -460], 560, 300);
  const form = wf.add("Meeting notes form", "n8n-nodes-base.formTrigger", 2.2, {
    formTitle: "Meeting notes",
    formDescription: "Paste the transcript or your notes. The summary and tasks arrive by email.",
    formFields: { values: [
      { fieldLabel: "Meeting title", requiredField: true },
      { fieldLabel: "Meeting date", fieldType: "date" },
      { fieldLabel: "Attendees (emails, comma separated)" },
      { fieldLabel: "Transcript or notes", fieldType: "textarea", requiredField: true },
    ] },
    options: { appendAttribution: false, respondWithOptions: { values: { respondWith: "text", formSubmittedText: "Thanks! The notes will arrive by email in a minute." } } },
  }, [-560, 0], { webhookId: uid("hook") });
  const hook = webhook(wf, "Transcript webhook", "meeting-transcript", [-560, 200]);
  const set = settings(wf, [
    ["teamName", "Your team"],
    ["notesEmail", "you@yourbusiness.com"],
    ["senderName", "Meeting assistant"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ...COMMON_AI,
  ], [-320, 100]);
  wf.connect(form, set);
  wf.connect(hook, set);
  const meeting = code(wf, "Meeting", [L.normalizeMeeting, L.buildMeetingRequest], `
const s = ${S};
return $input.all().map((item, i) => {
  const m = normalizeMeeting(item.json);
  return { json: { ...m, request: buildMeetingRequest(m, s) }, pairedItem: { item: i } };
}).filter((i) => i.json.transcript);`, [-100, 100]);
  wf.connect(set, meeting);
  const ai = openAi(wf, "Write notes with AI", [120, 100]);
  wf.connect(meeting, ai);
  const notes = code(wf, "Notes", [L.readAiJson, L.meetingEmail], `
const s = ${S};
const src = $('Meeting').all();
return $input.all().map((item, i) => {
  const m = src[i].json;
  const n = readAiJson(item.json);
  const recipients = [...new Set([...m.attendees, s.notesEmail].filter(Boolean))];
  return { json: { title: m.title, date: m.date, recipients: recipients.join(','), body: meetingEmail(m, n), action_items: n.action_items || [] }, pairedItem: { item: i } };
});`, [340, 100]);
  wf.connect(ai, notes);
  wf.connect(notes, gmailSend(wf, "Email the notes", {
    to: "={{ $json.recipients }}", subject: "=Notes: {{ $json.title }} ({{ $json.date }})", message: "={{ $json.body }}",
  }, [560, 0]));
  const tasks = code(wf, "Task rows", [], `
const now = new Date().toISOString();
return $input.all().flatMap((item, i) => (item.json.action_items || []).filter((a) => a.task).map((a) => ({ json: {
  meeting: item.json.title, meeting_date: item.json.date, task: a.task, owner: a.owner || '', due_date: a.due_date || '', status: 'open', created_at: now,
}, pairedItem: { item: i } })));`, [560, 220]);
  wf.connect(notes, tasks);
  wf.connect(tasks, sheetsAppend(wf, "Add tasks", "Tasks", [780, 220]));
  save("15-meeting-notes-task-assistant", wf);
}

// ------------------------------------------------------------------------------- 16. invoice & receipt extraction
{
  const wf = new Workflow("Invoice & Receipt Data Extraction | Ranime Jemal Agency");
  wf.note("## Invoice & Receipt Data Extraction (Google Drive)\nDrop invoices and receipts (PDF or photo) in a Google Drive **inbox** folder: the AI extracts supplier, number, dates, amounts, VAT and line items, checks they add up, logs them in Google Sheets and moves the file to a **processed** folder. Anything that does not add up is emailed for review.\n(For documents arriving by email, use automation 06.)\n1. In **Watch the inbox folder**, pick the inbox folder. 2. Fill in **Settings** (processed folder ID). 3. Make a sheet with a **Documents** tab (`documents-sheet.csv`). 4. Connect Google Drive, Google Sheets, Gmail and OpenAI. 5. Activate.", [-560, -480], 580, 320);
  const watch = wf.add("Watch the inbox folder", "n8n-nodes-base.googleDriveTrigger", 1, {
    pollTimes: { item: [{ mode: "everyX", value: 5, unit: "minutes" }] },
    triggerOn: "specificFolder",
    folderToWatch: { __rl: true, mode: "id", value: "YOUR_INBOX_FOLDER_ID" },
    event: "fileCreated",
    options: {},
  }, [-560, 100]);
  const set = settings(wf, [
    ["processedFolderId", "YOUR_PROCESSED_FOLDER_ID"],
    ["teamEmail", "accounts@yourbusiness.com"],
    ["senderName", "Document assistant"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ...COMMON_AI,
  ], [-320, 100]);
  wf.connect(watch, set);
  const download = wf.add("Download file", "n8n-nodes-base.googleDrive", 3, {
    operation: "download", fileId: { __rl: true, mode: "id", value: "={{ $json.id }}" }, options: {},
  }, [-100, 100]);
  wf.connect(set, download);
  const files = code(wf, "Supported files", [], `
return $input.all().map((item, i) => ({ item, i })).filter(({ item }) => {
  const mime = (item.binary && item.binary.data && item.binary.data.mimeType) || '';
  return mime === 'application/pdf' || /^image\\/(png|jpe?g|webp)$/.test(mime);
}).map(({ item, i }) => ({
  json: { file_id: item.json.id, file_name: item.json.name || item.binary.data.fileName, mime_type: item.binary.data.mimeType, source: 'drive', received_from: '' },
  binary: { data: item.binary.data }, pairedItem: { item: i },
}));`, [120, 100]);
  wf.connect(download, files);
  const prep = code(wf, "Prepare extraction", [L.documentPart, L.buildExtractRequest], PREPARE_EXTRACTION_JS, [340, 100]);
  wf.connect(files, prep);
  const ai = openAi(wf, "Extract data with AI", [560, 100]);
  wf.connect(prep, ai);
  const checked = code(wf, "Check the data", [L.readAiJson, L.checkExtraction, L.documentFileName], CHECK_DATA_JS, [780, 100]);
  wf.connect(ai, checked);
  const row = code(wf, "Document row", [], `
const files = $('Supported files').all();
return $input.all().map((item, i) => {
  const { drive_name, ...data } = item.json;
  return { json: { ...data, drive_file: files[i].json.file_name, drive_link: 'https://drive.google.com/file/d/' + files[i].json.file_id + '/view' }, pairedItem: { item: i } };
});`, [1000, 100]);
  wf.connect(checked, row);
  const log = sheetsAppend(wf, "Log in sheet", "Documents", [1220, 100]);
  wf.connect(row, log);
  const move = wf.add("Move to processed", "n8n-nodes-base.googleDrive", 3, {
    operation: "move",
    fileId: { __rl: true, mode: "id", value: "={{ $('Supported files').item.json.file_id }}" },
    driveId: { __rl: true, mode: "list", value: "My Drive" },
    folderId: { __rl: true, mode: "id", value: `={{ ${S}.processedFolderId }}` },
  }, [1440, 100]);
  wf.connect(log, move);
  const D = "$('Document row').item.json";
  const review = ifNode(wf, "Needs review?", condition(`={{ ${D}.status }}`, "equals", "needs review"), [1660, 100]);
  wf.connect(move, review);
  wf.connect(review, gmailSend(wf, "Ask for a review", {
    to: `={{ ${S}.teamEmail }}`,
    subject: `=Please check: {{ ${D}.original_file }}`,
    message: `=A document needs a quick check: {{ ${D}.issues }}\n\nSupplier: {{ ${D}.supplier_name }}\nNumber: {{ ${D}.invoice_number }}\nDate: {{ ${D}.invoice_date }}\nTotal: {{ ${D}.total }} {{ ${D}.currency }}\n\nFile: {{ ${D}.drive_link }}\nSheet: {{ ${S}.googleSheetUrl }}`,
  }, [1880, 0]), { output: 0 });
  save("16-invoice-receipt-data-extraction", wf);
}

// ------------------------------------------------------------------------------- 18. website uptime & incidents
{
  const wf = new Workflow("Website Uptime & Incident Notifier | Ranime Jemal Agency");
  wf.note("## Website Uptime & Incident Notifier\nEvery 5 minutes checks each site (optionally that a word appears on the page). After `confirmFailures` failed checks in a row it emails a DOWN alert and logs an incident; when the site is back it emails a RECOVERED notice with the downtime.\n1. Fill in **Settings** (one site per line, `https://site.com | text that must appear` is optional). 2. Make a sheet with an **Incidents** tab (`uptime-incidents-sheet.csv`). 3. Connect Google Sheets and Gmail. 4. Activate.", [-560, -440], 560, 280);
  const every = schedule(wf, "Every 5 minutes", "*/5 * * * *", [-560, 100]);
  const set = settings(wf, [
    ["sites", "https://www.example.com\nhttps://shop.example.com | Add to cart"],
    ["confirmFailures", 2, "number"],
    ["alertEmail", "you@yourbusiness.com"],
    ["senderName", "Uptime monitor"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
  ], [-320, 100]);
  wf.connect(every, set);
  const sites = code(wf, "Sites to check", [L.parseSites], `
return parseSites(${S}.sites).map((s) => ({ json: s, pairedItem: { item: 0 } }));`, [-100, 100]);
  wf.connect(set, sites);
  const check = wf.add("Check site", "n8n-nodes-base.httpRequest", 4.2, {
    url: "={{ $json.url }}",
    options: { response: { response: { fullResponse: true, neverError: true, responseFormat: "text" } }, timeout: 15000 },
  }, [120, 100], { onError: "continueRegularOutput" });
  wf.connect(sites, check);
  const events = code(wf, "Status changes", [L.siteStatus, L.uptimeEvents], `
const s = ${S};
const sitesToCheck = $('Sites to check').all();
const results = $input.all().map((item, i) => siteStatus(sitesToCheck[i].json, item.json));
return uptimeEvents(results, $getWorkflowStaticData('global'), new Date().toISOString(), Number(s.confirmFailures))
  .map((e) => ({ json: e, pairedItem: { item: results.findIndex((r) => r.url === e.url) } }));`, [340, 100]);
  wf.connect(check, events);
  const log = sheetsAppend(wf, "Log incident", "Incidents", [560, 100]);
  wf.connect(events, log);
  const U = "$('Status changes').item.json";
  wf.connect(log, gmailSend(wf, "Email the alert", {
    to: `={{ ${S}.alertEmail }}`,
    subject: `={{ ${U}.event === 'down' ? 'DOWN' : 'RECOVERED' }}: {{ ${U}.url }}`,
    message: `={{ ${U}.event === 'down' ? 'The site is not responding correctly.' : 'The site is back up after ' + ${U}.duration_minutes + ' minutes.' }}\n\nSite: {{ ${U}.url }}\nCheck result: {{ ${U}.detail }}\nTime: {{ ${U}.at }}`,
  }, [780, 100]));
  save("18-website-uptime-incident-notifier", wf);
}

// ===================================================================== security suite (19 to 23)
// Ready-made security automations: a company fills in Settings, connects its accounts, and activates.

function httpGet(wf, name, url, position, { query, text = false, full = false, noRedirect = false, timeout = 30000, auth, headers, batch, extra = {} } = {}) {
  const options = { timeout };
  if (text || full) options.response = { response: { ...(full ? { fullResponse: true } : {}), neverError: true, ...(text ? { responseFormat: "text" } : {}) } };
  if (noRedirect) options.redirect = { redirect: { followRedirects: false } };
  if (batch) options.batching = { batch: { batchSize: 1, batchInterval: batch } };
  return wf.add(name, "n8n-nodes-base.httpRequest", 4.2, {
    url,
    ...(auth === "virusTotal" ? { authentication: "predefinedCredentialType", nodeCredentialType: "virusTotalApi" } : {}),
    ...(auth === "header" ? { authentication: "genericCredentialType", genericAuthType: "httpHeaderAuth" } : {}),
    ...(query ? { sendQuery: true, queryParameters: { parameters: query.map(([name, value]) => ({ name, value })) } } : {}),
    ...(headers ? { sendHeaders: true, headerParameters: { parameters: headers.map(([name, value]) => ({ name, value })) } } : {}),
    options,
  }, position, extra);
}

// ------------------------------------------------------------------------------- 19. phishing email analyzer
{
  const wf = new Workflow("Phishing Email Analyzer | Ranime Jemal Agency");
  wf.note("## Phishing Email Analyzer\nEmployees forward suspicious emails to a reporting mailbox (for example phishing@yourcompany.com). For each report the workflow checks every link on VirusTotal, has the AI judge the email (phishing, suspicious, spam or safe), answers the employee with clear advice, logs the case, and alerts the security team about phishing.\n1. Create the reporting mailbox and connect it as the Gmail account of the trigger. 2. Fill in **Settings**. 3. Make a sheet with a **Phishing reports** tab (`phishing-reports-sheet.csv`). 4. Connect OpenAI, VirusTotal, Google Sheets and Gmail. 5. Activate and tell employees where to forward suspicious emails.", [-560, -480], 600, 320);
  const mail = gmailInbox(wf, "Reported email", "in:inbox -from:me", [-560, 100]);
  const set = settings(wf, [
    ["organisationName", "Your company"],
    ["securityTeamEmail", "security@yourcompany.com"],
    ["senderName", "IT security"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ...COMMON_AI,
  ], [-320, 100]);
  wf.connect(mail, set);
  const read = code(wf, "Read report", [L.extractUrls, L.phishingReport], `
return $input.all().map((item, i) => ({ json: phishingReport(item.json), pairedItem: { item: i } })).filter((i) => i.json.reporter);`, [-100, 100]);
  wf.connect(set, read);
  const links = code(wf, "Links to check", [L.vtUrlId], `
// One item per link (and one empty item for reports without links, so every report is judged).
return $input.all().flatMap((item, i) => {
  const urls = item.json.urls.slice(0, 5);
  return (urls.length ? urls : ['']).map((url) => ({ json: { report_index: i, url, vt_id: url ? vtUrlId(url) : '' }, pairedItem: { item: i } }));
});`, [120, 100]);
  wf.connect(read, links);
  const hasLink = ifNode(wf, "Has a link?", condition("={{ $json.url }}", "notEmpty"), [340, 100]);
  wf.connect(links, hasLink);
  const vt = httpGet(wf, "Link reputation (VirusTotal)", "=https://www.virustotal.com/api/v3/urls/{{ $json.vt_id }}", [560, 0], { auth: "virusTotal", timeout: 20000, extra: { onError: "continueRegularOutput" } });
  wf.connect(hasLink, vt, { output: 0 });
  const merge = wf.add("All links", "n8n-nodes-base.merge", 3, {}, [780, 100]);
  wf.connect(vt, merge, { input: 0 });
  wf.connect(hasLink, merge, { output: 1, input: 1 });
  const result = codeEach(wf, "Link result", [L.urlVerdict], `
const link = $('Links to check').item.json;
return { json: { report_index: link.report_index, ...(link.url ? urlVerdict(link.url, $json) : { url: '' }) } };`, [1000, 100]);
  wf.connect(merge, result);
  const prep = code(wf, "Prepare verdict", [L.buildPhishingRequest], `
const s = ${S};
const reports = $('Read report').all();
const checks = $input.all().map((i) => i.json);
return reports.map((r, i) => {
  const links = checks.filter((c) => c.report_index === i && c.url).map(({ report_index, ...c }) => c);
  return { json: { ...r.json, links, request: buildPhishingRequest(r.json, links, s) }, pairedItem: { item: i } };
});`, [1220, 100]);
  wf.connect(result, prep);
  const ai = openAi(wf, "Judge with AI", [1440, 100]);
  wf.connect(prep, ai);
  const row = code(wf, "Verdict", [L.readAiJson], `
const src = $('Prepare verdict').all();
return $input.all().map((item, i) => {
  const r = src[i].json;
  let v;
  try { v = readAiJson(item.json); } catch (e) { v = { verdict: 'suspicious', confidence: 'low', reasons: ['Automatic analysis failed: ' + e.message], advice_for_user: 'Do not click links or open attachments in this email. The security team will check it.', actions_for_it: [] }; }
  const flagged = r.links.filter((l) => l.malicious > 0);
  // A link flagged as malicious by VirusTotal always makes the report phishing, whatever the AI says.
  const verdict = flagged.length ? 'phishing' : (['phishing', 'suspicious', 'spam', 'safe'].includes(v.verdict) ? v.verdict : 'suspicious');
  return { json: {
    received_at: r.received_at, reporter: r.reporter, subject: r.subject, claimed_sender: r.claimed_sender, verdict, confidence: v.confidence || '',
    reasons: (v.reasons || []).join(' | '), malicious_links: flagged.map((l) => l.url).join(' '), links_checked: r.links.length,
    actions_for_it: (v.actions_for_it || []).join(' | '), advice_for_user: v.advice_for_user || '', status: 'open',
  }, pairedItem: { item: i } };
});`, [1660, 100]);
  wf.connect(ai, row);
  const log = sheetsAppend(wf, "Log report", "Phishing reports", [1880, 100]);
  wf.connect(row, log);
  const V = "$('Verdict').item.json";
  const reply = gmailSend(wf, "Answer the employee", {
    to: `={{ ${V}.reporter }}`,
    subject: `=Re: {{ ${V}.subject }} [{{ ${V}.verdict.toUpperCase() }}]`,
    message: `=Thank you for reporting this email.\n\nOur check says: {{ ${V}.verdict.toUpperCase() }} ({{ ${V}.confidence }} confidence).\n\n{{ ${V}.advice_for_user }}\n\n{{ ${S}.senderName }}`,
  }, [2100, 100]);
  wf.connect(log, reply);
  const danger = ifNode(wf, "Phishing or suspicious?", condition(`={{ ['phishing', 'suspicious'].includes(${V}.verdict) }}`, "true", "", "boolean"), [2320, 100]);
  wf.connect(reply, danger);
  wf.connect(danger, gmailSend(wf, "Alert the security team", {
    to: `={{ ${S}.securityTeamEmail }}`,
    subject: `=[{{ ${V}.verdict.toUpperCase() }}] reported by {{ ${V}.reporter }}: {{ ${V}.subject }}`,
    message: `=Claimed sender: {{ ${V}.claimed_sender }}\nWhy: {{ ${V}.reasons }}\nMalicious links (VirusTotal): {{ ${V}.malicious_links || 'none' }}\n\nRecommended actions:\n{{ ${V}.actions_for_it.split(' | ').filter(Boolean).map((a) => '- ' + a).join('\\n') }}\n\nIf the employee clicked a link or entered a password, reset their password and check their sign-ins now.`,
  }, [2540, 0]), { output: 0 });
  save("19-phishing-email-analyzer", wf);
}

// ------------------------------------------------------------------------------- 20. website security scanner
{
  const wf = new Workflow("Website Security & SSL Scanner | Ranime Jemal Agency");
  wf.note("## Website Security & SSL Scanner\nEvery Monday checks each website: HTTPS, HTTP to HTTPS redirect, security headers (HSTS, CSP, clickjacking, nosniff, referrer and permissions policies), version leaks, cookie flags and certificate expiry. Each site gets a grade (A to F) with the exact fixes, logged and emailed. The **Scan a website** form runs the same check on demand and emails the report to whoever asked.\nPassive checks only: it reads public responses like a browser does and never attacks the site.\n1. Fill in **Settings**. 2. Make a sheet with a **Scans** tab (`scans-sheet.csv`). 3. Connect Google Sheets and Gmail. 4. Activate.", [-560, -480], 600, 320);
  const weekly = schedule(wf, "Every Monday at 7:00", "0 7 * * 1", [-560, 0]);
  const form = wf.add("Scan a website", "n8n-nodes-base.formTrigger", 2.2, {
    formTitle: "Free website security check",
    formDescription: "We check HTTPS, security headers, cookies and the certificate, and email you a graded report with fixes.",
    formFields: { values: [
      { fieldLabel: "Website", placeholder: "https://www.example.com", requiredField: true },
      { fieldLabel: "Email for the report", fieldType: "email", requiredField: true },
    ] },
    options: { appendAttribution: false, respondWithOptions: { values: { respondWith: "text", formSubmittedText: "Thanks! The report will be in your inbox in a minute or two." } } },
  }, [-560, 200], { webhookId: uid("hook") });
  const set = settings(wf, [
    ["sites", "https://www.example.com\nhttps://shop.example.com"],
    ["reportEmail", "it@yourcompany.com"],
    ["certWarningDays", 21, "number"],
    ["senderName", "Website security scanner"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
  ], [-320, 100]);
  wf.connect(weekly, set);
  wf.connect(form, set);
  const sites = code(wf, "Sites to scan", [L.parseSites], `
const s = ${S};
if ($('Scan a website').isExecuted) {
  const f = $('Scan a website').first().json;
  let url = String(f['Website'] || '').trim();
  if (!/^https?:\\/\\//i.test(url)) url = 'https://' + url;
  url = url.replace(/^http:/i, 'https:');
  return [{ json: { url, host: url.replace(/^https?:\\/\\//i, '').split(/[\\/:?#]/)[0].toLowerCase(), recipient: f['Email for the report'] }, pairedItem: { item: 0 } }];
}
return parseSites(s.sites).map((x) => {
  const url = x.url.replace(/^http:/i, 'https:');
  return { json: { url, host: url.replace(/^https?:\\/\\//i, '').split(/[\\/:?#]/)[0].toLowerCase(), recipient: s.reportEmail }, pairedItem: { item: 0 } };
});`, [-100, 100]);
  wf.connect(set, sites);
  const site = "$('Sites to scan').item.json";
  const https = httpGet(wf, "HTTPS response", `={{ ${site}.url }}`, [120, 100], { full: true, text: true, timeout: 20000, extra: { onError: "continueRegularOutput" } });
  wf.connect(sites, https);
  const http = httpGet(wf, "HTTP redirect", `=http://{{ ${site}.host }}`, [340, 100], { full: true, text: true, noRedirect: true, timeout: 20000, extra: { onError: "continueRegularOutput" } });
  wf.connect(https, http);
  const certs = httpGet(wf, "Certificates (crt.sh)", "https://crt.sh/", [560, 100], {
    query: [["q", `={{ ${site}.host }}`], ["output", "json"], ["exclude", "expired"]], text: true, timeout: 60000,
    extra: { onError: "continueRegularOutput", retryOnFail: true, maxTries: 2, waitBetweenTries: 5000 },
  });
  wf.connect(http, certs);
  const grade = code(wf, "Grade", [L.websiteSecurity], `
const s = ${S};
const sites = $('Sites to scan').all();
const httpsAll = $('HTTPS response').all();
const httpAll = $('HTTP redirect').all();
const now = new Date().toISOString();
return $input.all().map((item, i) => {
  let certs = [];
  try { certs = JSON.parse(item.json.data || '[]'); } catch { certs = []; }
  const r = websiteSecurity(sites[i].json, httpsAll[i].json, httpAll[i].json, certs, now, Number(s.certWarningDays));
  return { json: { ...r, recipient: sites[i].json.recipient, scanned_at: now }, pairedItem: { item: i } };
});`, [780, 100]);
  wf.connect(certs, grade);
  const rows = code(wf, "Scan rows", [], `
return $input.all().map((item, i) => ({ json: {
  scanned_at: item.json.scanned_at, url: item.json.url, grade: item.json.grade, score: item.json.score,
  cert_days_left: item.json.cert_days_left ?? '', passed: item.json.passed + '/' + item.json.total,
  issues: item.json.failed.map((f) => f.check).join(' | '), requested_by: $('Scan a website').isExecuted ? item.json.recipient : 'weekly scan',
}, pairedItem: { item: i } }));`, [1000, 0]);
  wf.connect(grade, rows);
  wf.connect(rows, sheetsAppend(wf, "Log scans", "Scans", [1220, 0]));
  const report = code(wf, "Report", [L.securityReportText], `
const results = $input.all().map((i) => i.json);
const worst = results.reduce((w, r) => (r.score < w.score ? r : w), results[0]);
const certWarnings = results.filter((r) => r.failed.some((f) => f.check.startsWith('Certificate')));
return [{ json: {
  recipient: results[0].recipient, count: results.length, worst_grade: worst.grade,
  subject: (certWarnings.length ? 'Certificate expiring soon: ' : 'Website security report: ') + results.map((r) => r.host + ' ' + r.grade).join(', '),
  text: securityReportText(results),
}, pairedItem: results.map((_, i) => ({ item: i })) }];`, [1000, 200]);
  wf.connect(grade, report);
  wf.connect(report, gmailSend(wf, "Email the report", {
    to: "={{ $json.recipient }}",
    subject: "={{ $json.subject }}",
    message: "=Website security report ({{ $json.count }} site(s))\n\n{{ $json.text }}\n\nGrades: A 90-100, B 75-89, C 60-74, D 40-59, F below 40. Checks are passive: public responses only.",
  }, [1220, 200]));
  save("20-website-security-ssl-scanner", wf);
}

// ------------------------------------------------------------------------------- 21. vulnerability watch
{
  const wf = new Workflow("Vulnerability Watch (CVE + CISA KEV) | Ranime Jemal Agency");
  wf.note("## Vulnerability Watch\nEvery morning checks the CISA list of vulnerabilities **exploited in the wild** and the new CVEs published in the NVD, keeps those that mention the products you use (your watchlist), has the AI write a short advisory with what to do and how urgently, emails it and logs each CVE. Only new matches are reported.\n1. Fill in **Settings**: your watchlist (one product or vendor per line, for example `fortinet`, `exchange server`, `wordpress`) and a description of your environment. 2. Make a sheet with a **Vulnerabilities** tab (`vulnerabilities-sheet.csv`). 3. Connect OpenAI, Google Sheets and Gmail. 4. Activate.", [-560, -460], 600, 300);
  const daily = schedule(wf, "Every morning", "35 7 * * *", [-560, 100]);
  const set = settings(wf, [
    ["organisationName", "Your company"],
    ["environment", "Microsoft 365, Windows laptops, a FortiGate firewall, a WordPress website"],
    ["watchlist", "fortinet\nfortigate\nmicrosoft exchange\nwindows server\nwordpress\nopenssh\ncisco\nvmware"],
    ["minCvss", 7, "number"],
    ["alertEmail", "it@yourcompany.com"],
    ["senderName", "Vulnerability watch"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
    ...COMMON_AI,
  ], [-320, 100]);
  wf.connect(daily, set);
  const kev = httpGet(wf, "Exploited vulnerabilities (CISA KEV)", "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", [-100, 100], {
    timeout: 60000, extra: { retryOnFail: true, maxTries: 3, waitBetweenTries: 10000 },
  });
  wf.connect(set, kev);
  const nvd = httpGet(wf, "New CVEs (NVD)", "https://services.nvd.nist.gov/rest/json/cves/2.0", [120, 100], {
    query: [
      ["pubStartDate", `={{ $now.minus({ days: 2 }).toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS") }}`],
      ["pubEndDate", `={{ $now.toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS") }}`],
      ["resultsPerPage", "2000"],
    ],
    timeout: 90000, extra: { onError: "continueRegularOutput", retryOnFail: true, maxTries: 3, waitBetweenTries: 15000 },
  });
  wf.connect(kev, nvd);
  const match = code(wf, "Relevant vulnerabilities", [L.matchVulnerabilities, L.buildAdvisoryRequest], `
const s = ${S};
const vulns = matchVulnerabilities($('Exploited vulnerabilities (CISA KEV)').first().json, $input.first().json, s.watchlist, Number(s.minCvss), $getWorkflowStaticData('global'), new Date().toISOString());
if (!vulns.length) return [];
// Exploited ones first, then by CVSS.
vulns.sort((a, b) => (a.severity === 'exploited' ? -1 : 0) - (b.severity === 'exploited' ? -1 : 0) || (Number(b.cvss) || 0) - (Number(a.cvss) || 0));
return [{ json: { vulns, request: buildAdvisoryRequest(vulns.slice(0, 25), s) }, pairedItem: { item: 0 } }];`, [340, 100]);
  wf.connect(nvd, match);
  const ai = openAi(wf, "Write advisory with AI", [560, 100]);
  wf.connect(match, ai);
  const advisory = code(wf, "Advisory", [L.readAiJson], `
const vulns = $('Relevant vulnerabilities').first().json.vulns;
let a;
try { a = readAiJson($input.first().json); } catch { a = { headline: vulns.length + ' vulnerabilities match your watchlist', items: [] }; }
const advice = Object.fromEntries((a.items || []).map((x) => [x.cve, x]));
const lines = vulns.map((v) => {
  const x = advice[v.cve] || {};
  return '- ' + v.cve + ' (' + (v.severity === 'exploited' ? 'EXPLOITED IN THE WILD' : 'CVSS ' + v.cvss) + ', matches "' + v.matched + '")\\n  ' + v.summary.slice(0, 300)
    + (x.what_to_do ? '\\n  What to do (' + (x.urgency || '') + '): ' + x.what_to_do : '') + (v.due ? '\\n  CISA due date: ' + v.due : '');
});
const exploited = vulns.filter((v) => v.severity === 'exploited').length;
return [{ json: { subject: (exploited ? '[ACTION] ' + exploited + ' exploited vulnerabilities affect your watchlist' : (a.headline || vulns.length + ' new vulnerabilities')), text: lines.join('\\n\\n') }, pairedItem: { item: 0 } }];`, [780, 0]);
  wf.connect(ai, advisory);
  wf.connect(advisory, gmailSend(wf, "Email the advisory", {
    to: `={{ ${S}.alertEmail }}`, subject: "={{ $json.subject }}",
    message: `={{ $json.text }}\n\nSources: CISA Known Exploited Vulnerabilities and NIST NVD. Log: {{ ${S}.googleSheetUrl }}`,
  }, [1000, 0]));
  const rows = code(wf, "Vulnerability rows", [], `
const now = new Date().toISOString();
return $('Relevant vulnerabilities').first().json.vulns.map((v) => ({ json: {
  found_at: now, cve: v.cve, source: v.source, matched: v.matched, product: v.product, severity: v.severity, cvss: v.cvss,
  summary: v.summary.slice(0, 500), required_action: v.action, due: v.due, ransomware: v.ransomware, status: 'open',
}, pairedItem: { item: 0 } }));`, [780, 200]);
  wf.connect(ai, rows);
  wf.connect(rows, sheetsAppend(wf, "Log vulnerabilities", "Vulnerabilities", [1000, 200]));
  save("21-vulnerability-watch-cve-kev", wf);
}

// ------------------------------------------------------------------------------- 22. data breach monitor
{
  const wf = new Workflow("Data Breach Monitor (Have I Been Pwned) | Ranime Jemal Agency");
  wf.note("## Data Breach Monitor\nEvery Monday checks your team's email addresses against Have I Been Pwned. New breaches are logged with the kind of data exposed and what to do, the security contact gets a summary, and (optional) each affected person gets a short personal notice.\n1. Get a Have I Been Pwned API key (haveibeenpwned.com/API/Key) and create a Header Auth credential: name `hibp-api-key`, value = the key. 2. Fill in **Settings** (one email per line). 3. Make a sheet with a **Breaches** tab (`breaches-sheet.csv`). 4. Connect Google Sheets and Gmail. 5. Activate.", [-560, -460], 600, 300);
  const weekly = schedule(wf, "Every Monday at 8:15", "15 8 * * 1", [-560, 100]);
  const set = settings(wf, [
    ["organisationName", "Your company"],
    ["emails", "ceo@yourcompany.com\nfinance@yourcompany.com\nadmin@yourcompany.com"],
    ["notifyPeople", false, "boolean"],
    ["securityTeamEmail", "security@yourcompany.com"],
    ["senderName", "IT security"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
  ], [-320, 100]);
  wf.connect(weekly, set);
  const emails = code(wf, "Emails to check", [], `
return [...new Set(String(${S}.emails).split(/[\\n,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(e)))]
  .map((email) => ({ json: { email }, pairedItem: { item: 0 } }));`, [-100, 100]);
  wf.connect(set, emails);
  const hibp = httpGet(wf, "Have I Been Pwned", "=https://haveibeenpwned.com/api/v3/breachedaccount/{{ encodeURIComponent($json.email) }}", [120, 100], {
    auth: "header", query: [["truncateResponse", "false"]], headers: [["user-agent", "RJA-breach-monitor"]], text: true, full: true, batch: 6500, timeout: 20000,
    extra: { retryOnFail: true, maxTries: 3, waitBetweenTries: 10000 },
  });
  wf.connect(emails, hibp);
  const fresh = code(wf, "New breaches", [L.newBreaches, L.breachAdvice], `
const emails = $('Emails to check').all();
const store = $getWorkflowStaticData('global');
const now = new Date().toISOString();
return $input.all().flatMap((item, i) => {
  if (item.json.statusCode && item.json.statusCode !== 200) return [];   // 404 means no breach for this address
  let breaches = [];
  try { breaches = JSON.parse(item.json.body || item.json.data || '[]'); } catch { breaches = []; }
  return newBreaches(emails[i].json.email, breaches, store).map((b) => ({ json: { found_at: now, ...b, advice: breachAdvice(b.data) }, pairedItem: { item: i } }));
});`, [340, 100]);
  wf.connect(hibp, fresh);
  const log = sheetsAppend(wf, "Log breaches", "Breaches", [560, 100]);
  wf.connect(fresh, log);
  const B = "$('New breaches').item.json";
  const notify = ifNode(wf, "Notify the person?", condition(`={{ ${S}.notifyPeople }}`, "true", "", "boolean"), [780, 0]);
  wf.connect(log, notify);
  wf.connect(notify, gmailSend(wf, "Notify the person", {
    to: `={{ ${B}.email }}`,
    subject: "=Your work email appeared in the {{ " + B + ".breach }} data breach",
    message: `=Hello,\n\nYour address {{ ${B}.email }} appears in the {{ ${B}.breach }} breach ({{ ${B}.breach_date }}). Data exposed: {{ ${B}.data }}.\n\n{{ ${B}.advice }}\n\nThis does not mean your company account was hacked. If you have questions, reply to this email.\n\n{{ ${S}.senderName }}`,
  }, [1000, -60]), { output: 0 });
  const summary = code(wf, "Summary", [], `
const rows = $('New breaches').all().map((i) => i.json);
const lines = rows.map((r) => '- ' + r.email + ': ' + r.breach + ' (' + r.breach_date + ')' + (r.passwords ? ' [PASSWORDS EXPOSED]' : '') + '\\n  Data: ' + r.data);
return [{ json: { count: rows.length, people: new Set(rows.map((r) => r.email)).size, passwords: rows.filter((r) => r.passwords).length, text: lines.join('\\n') }, pairedItem: rows.map((_, i) => ({ item: i })) }];`, [780, 220], { executeOnce: true });
  wf.connect(log, summary);
  wf.connect(summary, gmailSend(wf, "Email the security team", {
    to: `={{ ${S}.securityTeamEmail }}`,
    subject: "={{ $json.count }} new breach(es) affecting {{ $json.people }} address(es){{ $json.passwords ? ', passwords exposed' : '' }}",
    message: `={{ $json.text }}\n\nFor exposed passwords: make sure the person changes the password everywhere it was reused and that two-factor authentication is on.\nLog: {{ ${S}.googleSheetUrl }}`,
  }, [1000, 220]));
  save("22-data-breach-monitor", wf);
}

// ------------------------------------------------------------------------------- 23. lookalike domain monitor
{
  const wf = new Workflow("Lookalike Domain Monitor | Ranime Jemal Agency");
  wf.note("## Lookalike Domain Monitor\nEvery day searches public certificate logs (Certificate Transparency, via crt.sh) for new domains that contain or imitate your brand, such as acme-login.com, acrne.com or punycode lookalikes. They are often set up for phishing before an attack. New ones are scored, logged and emailed so you can warn staff, block them and ask for a takedown.\nThe first run lists every existing match; after that only new ones.\n1. Fill in **Settings**. 2. Make a sheet with a **Lookalike domains** tab (`lookalike-domains-sheet.csv`). 3. Connect Google Sheets and Gmail. 4. Activate.", [-560, -460], 600, 300);
  const daily = schedule(wf, "Every day", "10 9 * * *", [-560, 100]);
  const set = settings(wf, [
    ["brandDomains", "yourcompany.com"],
    ["searchTerms", "yourcompany"],
    ["allowlist", "yourcompany-partner.com"],
    ["alertEmail", "security@yourcompany.com"],
    ["senderName", "Domain monitor"],
    ["googleSheetUrl", "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"],
  ], [-320, 100]);
  wf.connect(daily, set);
  const terms = code(wf, "Search terms", [], `
return String(${S}.searchTerms).split(/[\\n,]+/).map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 4)
  .map((term) => ({ json: { term }, pairedItem: { item: 0 } }));`, [-100, 100]);
  wf.connect(set, terms);
  const crt = httpGet(wf, "Certificate logs (crt.sh)", "https://crt.sh/", [120, 100], {
    query: [["q", "=%{{ $json.term }}%"], ["output", "json"], ["exclude", "expired"]], text: true, timeout: 120000, batch: 3000,
    extra: { onError: "continueRegularOutput", retryOnFail: true, maxTries: 3, waitBetweenTries: 15000 },
  });
  wf.connect(terms, crt);
  const found = code(wf, "New lookalikes", [L.levenshtein, L.lookalikeDomains], `
const s = ${S};
const entries = $input.all().flatMap((item) => { try { return JSON.parse(item.json.data || '[]'); } catch { return []; } });
const now = new Date().toISOString();
return lookalikeDomains(entries, s.brandDomains, s.allowlist, $getWorkflowStaticData('global'))
  .map((d) => ({ json: { found_at: now, ...d, status: 'to review' }, pairedItem: { item: 0 } }));`, [340, 100]);
  wf.connect(crt, found);
  const log = sheetsAppend(wf, "Log domains", "Lookalike domains", [560, 100]);
  wf.connect(found, log);
  const alert = code(wf, "Alert text", [], `
const rows = $('New lookalikes').all().map((i) => i.json);
const high = rows.filter((r) => r.risk === 'high');
return [{ json: { count: rows.length, high: high.length, text: rows.map((r) => '- [' + r.risk.toUpperCase() + '] ' + r.domain + ': ' + r.reasons).join('\\n') }, pairedItem: rows.map((_, i) => ({ item: i })) }];`, [780, 100], { executeOnce: true });
  wf.connect(log, alert);
  wf.connect(alert, gmailSend(wf, "Email the alert", {
    to: `={{ ${S}.alertEmail }}`,
    subject: "={{ $json.count }} new lookalike domain(s){{ $json.high ? ', ' + $json.high + ' high risk' : '' }}",
    message: `={{ $json.text }}\n\nWhat to do: block these domains in your email filter and web proxy, warn staff if any is high risk, and report phishing sites to the registrar or hosting provider.\nLog: {{ ${S}.googleSheetUrl }}`,
  }, [1000, 100]));
  save("23-lookalike-domain-monitor", wf);
}

// ============================================================================================ sheet templates
// Header rows for the Google Sheets each workflow uses (import the CSV into a new tab with the given name).
const SHEETS = {
  "01-ai-lead-generation-follow-up": { "leads-sheet.csv": [["lead_id", "received_at", "source", "name", "email", "phone", "company", "message", "budget", "score", "reason", "summary", "status", "follow_ups", "last_contact_at", "replied_at"]] },
  "02-ai-customer-service-chatbot": {
    "faq-sheet.csv": [["question", "answer"],
      ["What are your opening hours?", "Monday to Friday, 9:00 to 18:00."],
      ["How long does delivery take?", "Replace with your real delivery times."],
      ["What is your return policy?", "Replace with your real return policy."]],
    "conversations-sheet.csv": [["time", "session_id", "question", "answer"]],
  },
  "04-ai-social-media-automation": {
    "content-plan.csv": [["post_id", "publish_at", "topic", "notes", "call_to_action", "image_url", "status", "instagram", "facebook", "linkedin", "x", "hashtags", "published_to", "errors", "published_at"],
      ["P001", "2026-01-15T10:00:00+01:00", "Example: three ways our service saves you time", "Short, practical tips", "", "https://example.com/image.jpg", "idea", "", "", "", "", "", "", "", ""]],
  },
  "05-ai-voice-receptionist": { "calls-sheet.csv": [["call_id", "ended_at", "caller_number", "duration_seconds", "ended_reason", "summary", "transcript", "recording_url", "cost"]] },
  "06-ai-document-processing": { "documents-sheet.csv": [["processed_at", "source", "received_from", "original_file", "document_type", "supplier_name", "supplier_vat_id", "invoice_number", "invoice_date", "due_date", "currency", "subtotal", "vat_amount", "total", "line_items", "status", "issues", "drive_file", "drive_link"]] },
  "08-ai-lead-management-assistant": { "enquiries-sheet.csv": [["received_at", "source", "name", "email", "subject", "message", "category", "priority", "summary", "status", "thread_id"]] },
  "09-lead-enrichment-qualification": { "enriched-leads-sheet.csv": [["received_at", "source", "name", "email", "phone", "company", "domain", "website_read", "industry", "company_size", "what_they_do", "fit_score", "fit_reason", "confidence", "qualified", "owner", "message"]] },
  "10-social-media-content-scheduler": {
    "schedule-sheet.csv": [["post_id", "publish_at", "facebook", "instagram", "linkedin", "x", "hashtags", "image_url", "status", "published_to", "errors", "published_at"],
      ["P001", "2026-01-15T10:00:00+01:00", "Facebook text", "Instagram caption", "LinkedIn text", "", "#yourbrand", "https://example.com/image.jpg", "scheduled", "", "", ""]],
  },
  "11-review-reputation-monitor": { "reviews-sheet.csv": [["checked_at", "review_id", "published_at", "rating", "author", "text", "sentiment", "summary", "topics", "suggested_reply", "place_rating", "status"]] },
  "12-customer-support-ticket-triage": { "tickets-sheet.csv": [["ticket_id", "received_at", "name", "email", "subject", "category", "urgency", "sentiment", "language", "summary", "status", "thread_id"]] },
  "13-ecommerce-order-inventory-sync": {
    "inventory-sheet.csv": [["sku", "product", "stock", "low_stock_threshold", "last_order_at"], ["MUG-001", "Example mug", "40", "10", ""]],
    "orders-sheet.csv": [["order_id", "source", "created_at", "customer_email", "total", "currency", "items"]],
  },
  "14-abandoned-cart-recovery": { "carts-sheet.csv": [["checkout_id", "email", "first_name", "items", "total", "currency", "recovery_url", "created_at", "status", "reminders", "last_reminder_at", "recovered_order"]] },
  "15-meeting-notes-task-assistant": { "tasks-sheet.csv": [["meeting", "meeting_date", "task", "owner", "due_date", "status", "created_at"]] },
  "16-invoice-receipt-data-extraction": { "documents-sheet.csv": [["processed_at", "source", "received_from", "original_file", "document_type", "supplier_name", "supplier_vat_id", "invoice_number", "invoice_date", "due_date", "currency", "subtotal", "vat_amount", "total", "line_items", "status", "issues", "drive_file", "drive_link"]] },
  "18-website-uptime-incident-notifier": { "uptime-incidents-sheet.csv": [["url", "event", "at", "detail", "duration_minutes"]] },
  "19-phishing-email-analyzer": { "phishing-reports-sheet.csv": [["received_at", "reporter", "subject", "claimed_sender", "verdict", "confidence", "reasons", "malicious_links", "links_checked", "actions_for_it", "advice_for_user", "status"]] },
  "20-website-security-ssl-scanner": { "scans-sheet.csv": [["scanned_at", "url", "grade", "score", "cert_days_left", "passed", "issues", "requested_by"]] },
  "21-vulnerability-watch-cve-kev": { "vulnerabilities-sheet.csv": [["found_at", "cve", "source", "matched", "product", "severity", "cvss", "summary", "required_action", "due", "ransomware", "status"]] },
  "22-data-breach-monitor": { "breaches-sheet.csv": [["found_at", "email", "breach", "domain", "breach_date", "added", "data", "passwords", "verified", "advice"]] },
  "23-lookalike-domain-monitor": { "lookalike-domains-sheet.csv": [["found_at", "domain", "registered_domain", "risk", "reasons", "status"]] },
  "07-ai-security-monitoring-workflows": { "incidents-sheet.csv": [["received_at", "source", "title", "host", "ip", "rule", "severity", "ai_summary", "likely_cause", "false_positive_likelihood", "recommended_actions", "ip_malicious_votes", "ip_country", "details", "status"]] },
};
const csv = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v)).join(",")).join("\n") + "\n";
for (const [dir, files] of Object.entries(SHEETS)) {
  for (const [name, rows] of Object.entries(files)) writeFileSync(join(ROOT, dir, name), csv(rows));
}
