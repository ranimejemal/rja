import { describe, expect, it } from "vitest";
import { scanWorkflow } from "@/lib/workflow-scan";
import { checkFile, safeFileName } from "@/lib/files";

const wf = (nodes: unknown[], extra: Record<string, unknown> = {}) => JSON.stringify({ nodes, connections: {}, ...extra });

describe("scanWorkflow", () => {
  it("accepts a clean workflow and lists node and credential types", () => {
    const r = scanWorkflow(wf([
      { name: "Gmail", type: "n8n-nodes-base.gmail", parameters: {}, credentials: { gmailOAuth2: { id: "1", name: "Gmail" } } },
      { name: "Sheets", type: "n8n-nodes-base.googleSheets", parameters: { sheetId: "abc" } },
    ]));
    expect(r.ok).toBe(true);
    expect(r.findings).toEqual([]);
    expect(r.nodeTypes).toEqual(["n8n-nodes-base.gmail", "n8n-nodes-base.googleSheets"]);
    expect(r.credentialTypes).toEqual(["gmailOAuth2"]);
  });
  it("rejects invalid JSON and missing nodes", () => {
    expect(scanWorkflow("{not json").ok).toBe(false);
    expect(scanWorkflow(JSON.stringify({ connections: {} })).ok).toBe(false);
    expect(scanWorkflow("[]").ok).toBe(false);
  });
  it("rejects hard-coded secrets and embedded credential data", () => {
    const secret = scanWorkflow(wf([{ name: "HTTP", type: "n8n-nodes-base.httpRequest", parameters: { headers: { auth: "Bearer sk-proj-abcdefghijklmnopqrstuvwxyz123456" } } }]));
    expect(secret.ok).toBe(false);
    expect(secret.findings.map((f) => f.code)).toContain("hardcoded_secret");
    const creds = scanWorkflow(wf([{ name: "X", type: "n8n-nodes-base.slack", parameters: {}, credentials: { slackApi: { id: "1", accessToken: "xyz" } } }]));
    expect(creds.ok).toBe(false);
  });
  it("warns about shell commands, risky code, exfiltration hosts and pinned data", () => {
    const r = scanWorkflow(wf([
      { name: "Shell", type: "n8n-nodes-base.executeCommand", parameters: { command: "ls" } },
      { name: "Code", type: "n8n-nodes-base.code", parameters: { jsCode: "const cp = require('child_process'); return process.env" } },
      { name: "Send", type: "n8n-nodes-base.httpRequest", parameters: { url: "https://webhook.site/abc" } },
      { name: "IP", type: "n8n-nodes-base.httpRequest", parameters: { url: "http://10.0.0.1/collect" } },
    ], { pinData: { Shell: [{ json: { email: "someone@example.test" } }] } }));
    expect(r.ok).toBe(true);
    const codes = r.findings.map((f) => f.code);
    expect(codes).toEqual(expect.arrayContaining(["risky_node", "risky_code", "suspicious_host", "raw_ip", "pinned_data"]));
    expect(r.findings.every((f) => f.severity !== "error")).toBe(true);
  });
});

describe("checkFile", () => {
  const enc = (s: string) => new TextEncoder().encode(s);
  it("checks extension, size and content", () => {
    expect(checkFile("workflow", "flow.json", enc("{}"))).toEqual({ ok: true, mime: "application/json" });
    expect(checkFile("workflow", "flow.exe", enc("MZ")).ok).toBe(false);
    expect(checkFile("screenshot", "fake.png", enc("not a png")).ok).toBe(false);
    expect(checkFile("screenshot", "real.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2])).ok).toBe(true);
    expect(checkFile("readme", "README.md", new Uint8Array([0xff, 0xfe, 0xfd])).ok).toBe(false);
    expect(checkFile("readme", "big.md", new Uint8Array(600 * 1024).fill(65)).ok).toBe(false);
  });
  it("makes safe storage names", () => {
    expect(safeFileName("../../etc/My Flow (v2).JSON")).toBe("etc-my-flow-v2.json");
  });
});
