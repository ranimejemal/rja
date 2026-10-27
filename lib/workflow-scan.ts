// Static checks on an uploaded n8n workflow file. The workflow is parsed as data and never executed.
// These checks catch obvious problems only; they are not a guarantee that a workflow is safe.

export type Severity = "error" | "warning" | "info";
export type Finding = { severity: Severity; code: string; message: string; node?: string };
export type ScanReport = {
  ok: boolean; // false when any error was found: the file is rejected
  findings: Finding[];
  nodeCount: number;
  nodeTypes: string[];
  credentialTypes: string[];
};

export const MAX_WORKFLOW_BYTES = 2 * 1024 * 1024;

const SECRET_PATTERNS: [RegExp, string][] = [
  [/\bsk_(live|test)_[A-Za-z0-9]{16,}/, "Stripe secret key"],
  [/\bsk-(proj-)?[A-Za-z0-9_-]{20,}/, "OpenAI-style API key"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, "GitHub token"],
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}/, "Slack token"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, "Google API key"],
  [/\bBearer\s+[A-Za-z0-9._-]{30,}/, "bearer token"],
];

const RISKY_NODE_TYPES: Record<string, string> = {
  "n8n-nodes-base.executeCommand": "runs shell commands on the n8n server",
  "n8n-nodes-base.ssh": "opens SSH sessions to other machines",
  "n8n-nodes-base.readWriteFile": "reads or writes files on the n8n server",
  "n8n-nodes-base.readBinaryFiles": "reads files from the n8n server",
  "n8n-nodes-base.writeBinaryFile": "writes files on the n8n server",
};

const CODE_PATTERNS: [RegExp, string][] = [
  [/child_process|\bexecSync\b|\bspawn\(/, "starts system processes"],
  [/\beval\s*\(|new\s+Function\s*\(/, "evaluates dynamic code"],
  [/require\(\s*['"](fs|net|dgram|os|vm)['"]\s*\)/, "uses low-level Node.js modules"],
  [/process\.env/, "reads server environment variables"],
  [/\$env\./, "reads n8n environment variables"],
];

const EXFIL_HOSTS = /(ngrok|pastebin\.com|requestbin|webhook\.site|pipedream\.net|discord(app)?\.com\/api\/webhooks|api\.telegram\.org\/bot)/i;
const RAW_IP_URL = /https?:\/\/(\d{1,3}\.){3}\d{1,3}/;

type N8nNode = { name?: unknown; type?: unknown; parameters?: unknown; credentials?: unknown };

function strings(value: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 20) return out;
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out, depth + 1));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out, depth + 1));
  return out;
}

export function scanWorkflow(raw: string): ScanReport {
  const findings: Finding[] = [];
  const report = (): ScanReport => ({
    ok: !findings.some((f) => f.severity === "error"),
    findings, nodeCount: nodes.length, nodeTypes: [...types].sort(), credentialTypes: [...creds].sort(),
  });
  let nodes: N8nNode[] = [];
  const types = new Set<string>();
  const creds = new Set<string>();

  if (new TextEncoder().encode(raw).length > MAX_WORKFLOW_BYTES) {
    findings.push({ severity: "error", code: "too_large", message: "Workflow file is larger than 2 MB." });
    return report();
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    findings.push({ severity: "error", code: "invalid_json", message: "The file is not valid JSON." });
    return report();
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    findings.push({ severity: "error", code: "invalid_structure", message: "Expected an n8n workflow object." });
    return report();
  }
  const wf = data as { nodes?: unknown; connections?: unknown; pinData?: unknown };
  if (!Array.isArray(wf.nodes) || wf.nodes.length === 0) {
    findings.push({ severity: "error", code: "no_nodes", message: "The workflow has no nodes array." });
    return report();
  }
  if (wf.nodes.length > 500) {
    findings.push({ severity: "error", code: "too_many_nodes", message: "The workflow has more than 500 nodes." });
    return report();
  }
  if (!wf.connections || typeof wf.connections !== "object") {
    findings.push({ severity: "error", code: "no_connections", message: "The workflow has no connections object." });
  }
  nodes = wf.nodes as N8nNode[];

  nodes.forEach((n, i) => {
    const name = typeof n.name === "string" ? n.name : `node ${i + 1}`;
    if (typeof n.type !== "string" || !n.type) {
      findings.push({ severity: "error", code: "node_without_type", message: "A node has no type.", node: name });
      return;
    }
    types.add(n.type);
    if (RISKY_NODE_TYPES[n.type]) {
      findings.push({ severity: "warning", code: "risky_node", message: `${n.type} ${RISKY_NODE_TYPES[n.type]}.`, node: name });
    }
    if (n.credentials && typeof n.credentials === "object") {
      for (const [credType, ref] of Object.entries(n.credentials as Record<string, unknown>)) {
        creds.add(credType);
        const keys = ref && typeof ref === "object" ? Object.keys(ref) : [];
        if (keys.some((k) => !["id", "name"].includes(k))) {
          findings.push({ severity: "error", code: "embedded_credentials", message: `Credential "${credType}" contains data, not just a reference.`, node: name });
        }
      }
    }
    for (const s of strings(n.parameters)) {
      for (const [re, what] of SECRET_PATTERNS) {
        if (re.test(s)) findings.push({ severity: "error", code: "hardcoded_secret", message: `Looks like a hard-coded ${what}. Use n8n credentials instead.`, node: name });
      }
      if (/code|function/i.test(n.type)) {
        for (const [re, what] of CODE_PATTERNS) {
          if (re.test(s)) findings.push({ severity: "warning", code: "risky_code", message: `Code ${what}.`, node: name });
        }
      }
      if (EXFIL_HOSTS.test(s)) findings.push({ severity: "warning", code: "suspicious_host", message: "Sends data to a host often used for data collection or tunnelling.", node: name });
      if (RAW_IP_URL.test(s)) findings.push({ severity: "warning", code: "raw_ip", message: "Calls a raw IP address instead of a domain.", node: name });
    }
    if (n.type === "n8n-nodes-base.webhook") {
      findings.push({ severity: "info", code: "webhook", message: "Exposes a public webhook URL once activated.", node: name });
    }
  });

  if (wf.pinData && typeof wf.pinData === "object" && Object.keys(wf.pinData).length > 0) {
    findings.push({ severity: "warning", code: "pinned_data", message: "Contains pinned execution data, which may include personal data. Remove it before publishing." });
  }

  // De-duplicate identical findings on the same node.
  const seen = new Set<string>();
  const unique = findings.filter((f) => {
    const k = `${f.severity}|${f.code}|${f.node ?? ""}|${f.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  findings.length = 0;
  findings.push(...unique);
  return report();
}
