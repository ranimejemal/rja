import "server-only";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseManifest, type ConfigValues, type Manifest } from "@/lib/manifest";

// The agency's own automations live in the repository (automations/NN-slug/): the n8n workflow, its setup form
// (setup.json, generated from the Settings node), the Google Sheet templates (*.csv) and a README.
// Buyers download the workflow with their setup answers already written into its Settings node.

const ROOT = join(process.cwd(), "automations");

async function folder(slug: string) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  const dirs = await readdir(ROOT).catch(() => [] as string[]);
  return dirs.find((d) => d === `${d.slice(0, 2)}-${slug}` && /^\d\d-/.test(d)) ?? null;
}

export async function hasRepoAutomation(slug: string) {
  return (await folder(slug)) !== null;
}

export async function loadSetupForm(slug: string): Promise<Manifest | null> {
  const dir = await folder(slug);
  if (!dir) return null;
  const parsed = parseManifest(JSON.parse(await readFile(join(ROOT, dir, "setup.json"), "utf8")));
  return parsed.ok ? parsed.manifest : null;
}

export async function loadReadme(slug: string) {
  const dir = await folder(slug);
  return dir ? readFile(join(ROOT, dir, "README.md"), "utf8") : null;
}

/** Google Sheet templates: file name and the tab name it stands for ("leads-sheet.csv" is the "Leads" tab). */
export async function sheetTemplates(slug: string) {
  const dir = await folder(slug);
  if (!dir) return [];
  const files = (await readdir(join(ROOT, dir))).filter((f) => f.endsWith(".csv")).sort();
  return files.map((file) => ({ file, tab: tabName(file) }));
}

/** Other ready-made files that come with the automation, e.g. the Vapi assistant configuration. */
export async function extraFiles(slug: string) {
  const dir = await folder(slug);
  if (!dir) return [];
  return (await readdir(join(ROOT, dir))).filter(isExtraFile).sort();
}
const isExtraFile = (f: string) => /^[a-z0-9-]+\.json$/.test(f) && f !== "workflow.json" && f !== "setup.json";

/** A sheet template or extra file of the automation; never the workflow itself (that one is personalized). */
export async function readSheetTemplate(slug: string, file: string) {
  const dir = await folder(slug);
  if (!dir || !(/^[a-z0-9-]+\.csv$/.test(file) || isExtraFile(file))) return null;
  return readFile(join(ROOT, dir, file), "utf8").catch(() => null);
}

function tabName(file: string) {
  const base = file.replace(/\.csv$/, "").replace(/-sheet$/, "").replace(/-/g, " ");
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Integrations the workflow uses, from its credential slots: each one is a "connect your account" step. */
export async function credentialsUsed(slug: string) {
  const dir = await folder(slug);
  if (!dir) return [];
  const wf = JSON.parse(await readFile(join(ROOT, dir, "workflow.json"), "utf8")) as Workflow;
  const types = new Set<string>();
  for (const n of wf.nodes) {
    if (n.disabled) continue;
    const p = n.parameters as { nodeCredentialType?: string; authentication?: string; genericAuthType?: string };
    if (p.nodeCredentialType) types.add(p.nodeCredentialType);
    if (p.genericAuthType) types.add(p.genericAuthType);
    if (n.type === "n8n-nodes-base.webhook" && p.authentication === "headerAuth") types.add("webhookHeaderAuth");
    for (const t of CREDENTIALS_BY_NODE[n.type] ?? []) types.add(t);
  }
  return [...types];
}

// Node types whose credential is implied by the node itself.
const CREDENTIALS_BY_NODE: Record<string, string[]> = {
  "n8n-nodes-base.gmail": ["gmailOAuth2"],
  "n8n-nodes-base.gmailTool": ["gmailOAuth2"],
  "n8n-nodes-base.googleSheetsTool": ["googleSheetsOAuth2Api"],
  "n8n-nodes-base.googleCalendarTool": ["googleCalendarOAuth2Api"],
  "n8n-nodes-base.gmailTrigger": ["gmailOAuth2"],
  "n8n-nodes-base.googleSheets": ["googleSheetsOAuth2Api"],
  "n8n-nodes-base.googleCalendar": ["googleCalendarOAuth2Api"],
  "n8n-nodes-base.googleDrive": ["googleDriveOAuth2Api"],
  "n8n-nodes-base.googleDriveTrigger": ["googleDriveOAuth2Api"],
  "n8n-nodes-base.shopifyTrigger": ["shopifyAccessTokenApi"],
  "n8n-nodes-base.wooCommerceTrigger": ["wooCommerceApi"],
  "n8n-nodes-base.facebookGraphApi": ["facebookGraphApi"],
  "n8n-nodes-base.facebookLeadAdsTrigger": ["facebookLeadAdsOAuth2Api"],
  "n8n-nodes-base.linkedIn": ["linkedInOAuth2Api"],
  "@n8n/n8n-nodes-langchain.lmChatOpenAi": ["openAiApi"],
};

type Workflow = {
  name: string;
  nodes: { name: string; type: string; disabled?: boolean; parameters: Record<string, unknown> }[];
  [k: string]: unknown;
};
type Assignment = { id: string; name: string; value: unknown; type: string };

/**
 * The workflow with the buyer's answers in its Settings node. Only values the setup form declares are written
 * (validated earlier against that form), converted to the type the node expects. `seed` makes generated
 * secrets (the Meta webhook verify token) stable for the same saved configuration.
 */
export async function personalizedWorkflow(slug: string, values: ConfigValues, seed: string) {
  const dir = await folder(slug);
  if (!dir) return null;
  const wf = JSON.parse(await readFile(join(ROOT, dir, "workflow.json"), "utf8")) as Workflow;
  const settings = wf.nodes.find((n) => n.name === "Settings");
  if (!settings) return null;
  const form = await loadSetupForm(slug);
  const allowed = new Set(form?.settings.map((s) => s.key));
  const list = (settings.parameters.assignments as { assignments: Assignment[] }).assignments;
  for (const a of list) {
    const key = a.name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    if (a.name === "metaVerifyToken") a.value = verifyToken(seed);
    else if (allowed.has(key) && key in values) a.value = toSettingType(values[key], a.type);
  }
  // A fresh, inactive copy when imported.
  delete wf.id;
  wf.active = false;
  return { workflow: wf, fileName: `${dir}.json` };
}

export function verifyToken(seed: string) {
  return `rja-${createHash("sha256").update(`meta-verify:${seed}`).digest("hex").slice(0, 32)}`;
}

function toSettingType(v: ConfigValues[string], type: string) {
  if (type === "number") return Number(v);
  if (type === "boolean") return v === true;
  return Array.isArray(v) ? v.join("\n") : String(v);
}
