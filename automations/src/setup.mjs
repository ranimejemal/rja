// Builds the customer setup form (setup.json) of every workflow from its Settings node and the plain-language
// field descriptions in setup-fields.mjs, and prints the SQL that attaches the forms to the marketplace listings.
//
//   node automations/src/setup.mjs            write automations/*/setup.json
//   node automations/src/setup.mjs --sql      also print the migration SQL (versions + manifests)
//
// Run after build.mjs. Fails if a Settings value has no description, so every new value gets a label.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FIELDS, OVERRIDES, formKey } from "./setup-fields.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const WORKFLOW_VERSION = "1.0.0";

export function setupForm(workflow, slug) {
  const node = workflow.nodes.find((n) => n.name === "Settings");
  if (!node) throw new Error(`${workflow.name}: no Settings node`);
  const settings = [];
  for (const a of node.parameters.assignments.assignments) {
    const f = FIELDS[a.name] && { ...FIELDS[a.name], ...OVERRIDES[slug]?.[a.name] };
    if (!f) throw new Error(`${workflow.name}: no description for Settings value "${a.name}" in setup-fields.mjs`);
    if (f.hidden) continue;
    const s = { key: formKey(a.name), label: f.label, help: f.help, type: f.type, required: Boolean(f.required) };
    if (f.type === "number") Object.assign(s, f.min !== undefined && { min: f.min }, f.max !== undefined && { max: f.max });
    if (f.type === "textarea") s.maxLength = 2000;
    if (f.type === "text") s.maxLength = 300;
    if (f.keep && a.value !== "" && a.value !== null) s.default = a.value;
    settings.push(s);
  }
  return { schemaVersion: 1, productType: "n8n-workflow", workflowVersion: WORKFLOW_VERSION, settings };
}

// Apps a workflow really uses, from its nodes: shown as "Required apps" on the listing. Disabled nodes are optional.
const APP_BY_NODE = {
  "n8n-nodes-base.gmail": "Gmail", "n8n-nodes-base.gmailTrigger": "Gmail", "n8n-nodes-base.gmailTool": "Gmail",
  "n8n-nodes-base.googleSheets": "Google Sheets", "n8n-nodes-base.googleSheetsTool": "Google Sheets",
  "n8n-nodes-base.googleCalendar": "Google Calendar", "n8n-nodes-base.googleCalendarTool": "Google Calendar",
  "n8n-nodes-base.googleDrive": "Google Drive", "n8n-nodes-base.googleDriveTrigger": "Google Drive",
  "@n8n/n8n-nodes-langchain.lmChatOpenAi": "OpenAI",
  "n8n-nodes-base.facebookGraphApi": "Facebook and Instagram", "n8n-nodes-base.facebookLeadAdsTrigger": "Meta Lead Ads",
  "n8n-nodes-base.linkedIn": "LinkedIn", "n8n-nodes-base.twitter": "X",
  "n8n-nodes-base.shopifyTrigger": "Shopify", "n8n-nodes-base.wooCommerceTrigger": "WooCommerce",
  "n8n-nodes-base.formTrigger": "Web form (included)", "@n8n/n8n-nodes-langchain.chatTrigger": "Website chat (included)",
};
const CREDENTIAL_APP = { openAiApi: "OpenAI", virusTotalApi: "VirusTotal" };
// Services reached without a node of their own (public data, or tools that call the workflow).
const EXTRA_APPS = {
  "ai-voice-receptionist": ["Vapi"],
  "ai-security-monitoring-workflows": ["Wazuh, Grafana or AWS GuardDuty (your alert tool)"],
  "review-reputation-monitor": ["Google Places API"],
  "data-breach-monitor": ["Have I Been Pwned"],
  "vulnerability-watch-cve-kev": ["CISA KEV (free)", "NIST NVD (free)"],
  "website-security-ssl-scanner": ["crt.sh (free)"],
  "lookalike-domain-monitor": ["crt.sh (free)"],
};
const NO_ACCOUNT = /\((free|included|your alert tool)\)$/;
// Apps of which the customer needs only one.
const ONE_OF = { "ecommerce-order-inventory-sync": ["Shopify", "WooCommerce"] };

export function appsUsed(workflow, slug) {
  let required = new Set();
  const optional = new Set();
  for (const n of workflow.nodes) {
    const app = APP_BY_NODE[n.type] ?? CREDENTIAL_APP[n.parameters?.nodeCredentialType];
    if (app) (n.disabled ? optional : required).add(app);
  }
  for (const a of EXTRA_APPS[slug] ?? []) required.add(a);
  for (const a of required) optional.delete(a);
  const oneOf = ONE_OF[slug];
  if (oneOf) { for (const a of oneOf) required.delete(a); required = new Set([oneOf.join(" or "), ...required]); }
  const integrations = [...required, ...[...optional].map((a) => `${a} (optional)`)];
  const accounts = [...required].filter((a) => !NO_ACCOUNT.test(a));
  const prerequisites = `An n8n account (n8n Cloud or your own n8n, version 1.123 or newer) and your own ${list(accounts)} account${accounts.length > 1 ? "s" : ""}.`
    + (optional.size ? ` Optional: ${list([...optional])}.` : "");
  return { integrations, prerequisites };
}
const list = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a.at(-1)}`);

export function workflowDirs() {
  return readdirSync(ROOT).filter((d) => /^\d\d-/.test(d)).sort();
}

const sql = [];
for (const dir of workflowDirs()) {
  const workflow = JSON.parse(readFileSync(join(ROOT, dir, "workflow.json"), "utf8"));
  const slug = dir.slice(3);
  const form = setupForm(workflow, slug);
  writeFileSync(join(ROOT, dir, "setup.json"), JSON.stringify(form, null, 2) + "\n");
  const apps = appsUsed(workflow, slug);
  const arr = `array[${apps.integrations.map((a) => `'${a.replace(/'/g, "''")}'`).join(", ")}]`;
  sql.push(`  ('${slug}', $m$${JSON.stringify(form)}$m$::jsonb, ${arr}, '${apps.prerequisites.replace(/'/g, "''")}')`);
}
if (process.argv.includes("--sql")) console.log(sql.join(",\n"));
else console.log(`Wrote setup.json for ${sql.length} workflows.`);
