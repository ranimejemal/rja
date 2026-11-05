import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Talks to the customer's own n8n through its public API, with an API key the customer pastes for this
// conversation only (never stored). Used by the setup assistant to read the last error and, after the customer
// confirms, to change a few values of the automation's Settings box or retry a failed run. Nothing else.
//
// The address comes from the customer, so requests are limited to public HTTPS hosts (no internal addresses),
// without redirects and with a short timeout.

export class N8nError extends Error {}

const TIMEOUT_MS = 15_000;

export function privateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? privateAddress(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19));
}

/** The n8n base address (https://name.app.n8n.cloud), or an error message for the customer. */
export async function checkN8nUrl(raw: string): Promise<{ ok: true; base: string } | { ok: false; error: string }> {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return { ok: false, error: "That is not a web address. Copy it from your browser, e.g. https://yourname.app.n8n.cloud" }; }
  if (url.protocol !== "https:") return { ok: false, error: "The address must start with https://" };
  if (url.username || url.password || (url.port && url.port !== "443")) return { ok: false, error: "Use the plain address of your n8n, without a port or password." };
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) {
    return { ok: false, error: "Use the public address of your n8n (a name like yourname.app.n8n.cloud, not an IP or local address)." };
  }
  try {
    const addrs = await lookup(host, { all: true });
    if (!addrs.length || addrs.some((a) => privateAddress(a.address))) return { ok: false, error: "This address is not reachable from the internet." };
  } catch {
    return { ok: false, error: "This address does not exist. Check the spelling." };
  }
  return { ok: true, base: `https://${url.host}` };
}

async function call<T>(base: string, key: string, path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1${path}`, {
      ...init, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "X-N8N-API-KEY": key, Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
    });
  } catch {
    throw new N8nError("Your n8n did not answer. Check the address and that your n8n is running.");
  }
  if (res.status === 401 || res.status === 403) throw new N8nError("Your n8n refused the API key. Create a new one in n8n: Settings → n8n API → Create an API key.");
  if (res.status === 404) throw new N8nError("not found");
  if (!res.ok) throw new N8nError(`Your n8n answered with an error (${res.status}).`);
  const text = await res.text();
  if (text.length > 5_000_000) throw new N8nError("Your n8n sent too much data.");
  try { return JSON.parse(text) as T; } catch { throw new N8nError("This does not look like an n8n address."); }
}

type Node = { name: string; type: string; disabled?: boolean; parameters: Record<string, unknown> };
type Workflow = { id: string; name: string; active?: boolean; nodes: Node[]; connections: unknown; settings?: Record<string, unknown> };
type Execution = { id: string | number; workflowId: string; status?: string; startedAt?: string; stoppedAt?: string; data?: unknown };

/** The customer's workflows, with the best guess for this automation first (its name, newest first). */
export async function findWorkflows(base: string, key: string, workflowName: string) {
  const { data } = await call<{ data: { id: string; name: string; active: boolean; updatedAt?: string }[] }>(base, key, "/workflows?limit=250");
  const want = simplify(workflowName);
  const score = (name: string) => (simplify(name) === want ? 2 : simplify(name).includes(want) || want.includes(simplify(name)) ? 1 : 0);
  const all = data.map((w) => ({ id: String(w.id), name: w.name, active: Boolean(w.active), updatedAt: w.updatedAt ?? "", score: score(w.name) }))
    .sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt));
  return { match: all[0]?.score ? all[0] : null, all: all.slice(0, 50).map(({ id, name }) => ({ id, name })) };
}
// "AI Lead Generation & Follow-up | Ranime Jemal Agency" and "Lead generation follow up (copy)" compare equal.
const simplify = (s: string) => s.split("|")[0].toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(ai|the|and|copy|\d+)\b/g, " ").replace(/\s+/g, " ").trim();

export type LastError = { executionId: string; at: string | null; node: string | null; message: string };

/** The error of the workflow's most recent failed run, or null when it has none. */
export async function lastError(base: string, key: string, workflowId: string): Promise<LastError | null> {
  const list = await call<{ data: Execution[] }>(base, key, `/executions?workflowId=${encodeURIComponent(workflowId)}&status=error&limit=1&includeData=true`);
  const ex = list.data[0];
  if (!ex) return null;
  const { node, message } = errorOf(ex.data);
  return { executionId: String(ex.id), at: ex.stoppedAt ?? ex.startedAt ?? null, node, message };
}

/** The error message n8n stored in an execution (data.resultData.error, or the failing node's run). */
export function errorOf(data: unknown): { node: string | null; message: string } {
  const rd = (data as { resultData?: { error?: ErrorShape; lastNodeExecuted?: string; runData?: Record<string, { error?: ErrorShape }[]> } } | null)?.resultData;
  const parts: string[] = [];
  const add = (e?: ErrorShape) => {
    if (!e) return;
    for (const v of [e.message, e.description, typeof e.httpCode === "string" ? `HTTP ${e.httpCode}` : null]) if (v && !parts.includes(String(v))) parts.push(String(v));
  };
  add(rd?.error);
  let node = rd?.error?.node?.name ?? rd?.lastNodeExecuted ?? null;
  for (const [name, runs] of Object.entries(rd?.runData ?? {})) {
    const e = runs?.find((r) => r?.error)?.error;
    if (e) { add(e); node ??= name; }
  }
  return { node, message: parts.join(" — ").slice(0, 1500) || "The run failed without a message." };
}
type ErrorShape = { message?: string; description?: string | null; httpCode?: string | null; node?: { name?: string } };

// Settings values the assistant may change. Everything else in the workflow is left exactly as it is.
const FIXABLE = new Set(["openAiBaseUrl", "openAiModel"]);
// Workflow settings the n8n API accepts back on update.
const SETTING_KEYS = ["saveExecutionProgress", "saveManualExecutions", "saveDataErrorExecution", "saveDataSuccessExecution",
  "executionTimeout", "errorWorkflow", "timezone", "executionOrder", "callerPolicy"];

/** Writes new values into the workflow's Settings box. Returns the values that changed (name: [old, new]). */
export async function updateSettings(base: string, key: string, workflowId: string, values: Record<string, string>) {
  for (const k of Object.keys(values)) if (!FIXABLE.has(k)) throw new N8nError(`"${k}" cannot be changed from here.`);
  const wf = await call<Workflow>(base, key, `/workflows/${encodeURIComponent(workflowId)}`);
  const settingsNode = wf.nodes.find((n) => n.name === "Settings");
  const list = (settingsNode?.parameters.assignments as { assignments?: { name: string; value: unknown }[] } | undefined)?.assignments;
  if (!list) throw new N8nError("This workflow has no Settings box.");
  const changed: Record<string, [unknown, string]> = {};
  for (const a of list) {
    if (a.name in values && a.value !== values[a.name]) { changed[a.name] = [a.value, values[a.name]]; a.value = values[a.name]; }
  }
  if (!Object.keys(changed).length) return changed;
  const settings = Object.fromEntries(SETTING_KEYS.filter((k) => wf.settings && k in wf.settings).map((k) => [k, wf.settings![k]]));
  await call(base, key, `/workflows/${encodeURIComponent(workflowId)}`, {
    method: "PUT", body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings }),
  });
  return changed;
}

/** Runs a failed execution again (n8n 1.90+). False when this n8n cannot do it through the API. */
export async function retryExecution(base: string, key: string, executionId: string) {
  try {
    await call(base, key, `/executions/${encodeURIComponent(executionId)}/retry`, { method: "POST", body: JSON.stringify({ loadWorkflow: true }) });
    return true;
  } catch (e) {
    if (e instanceof N8nError && e.message === "not found") return false;
    throw e;
  }
}
