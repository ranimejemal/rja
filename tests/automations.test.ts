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

// The generated workflows: each one must pass the marketplace upload scan and reference only existing nodes.
const dir = join(__dirname, "..", "automations");
const workflows = existsSync(dir)
  ? readdirSync(dir).filter((d) => existsSync(join(dir, d, "workflow.json"))).map((d) => ({ name: d, raw: readFileSync(join(dir, d, "workflow.json"), "utf8") }))
  : [];

describe("workflow files", () => {
  it("there are seven", () => expect(workflows).toHaveLength(7));
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
