import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseManifest, validateConfig } from "@/lib/manifest";
import { credentialsUsed, loadSetupForm, personalizedWorkflow, sheetTemplates, verifyToken } from "@/lib/automations";

const ROOT = join(process.cwd(), "automations");
const dirs = readdirSync(ROOT).filter((d) => /^\d\d-/.test(d)).sort();

type Assignment = { name: string; value: unknown; type: string };
const settingsOf = (wf: { nodes: { name: string; parameters: { assignments?: { assignments: Assignment[] } } }[] }) =>
  wf.nodes.find((n) => n.name === "Settings")!.parameters.assignments!.assignments;

describe("customer setup forms", () => {
  it("exist for every workflow and are valid forms", () => {
    expect(dirs.length).toBe(22);
    for (const d of dirs) {
      const r = parseManifest(JSON.parse(readFileSync(join(ROOT, d, "setup.json"), "utf8")));
      expect(r.ok, `${d}: ${r.ok ? "" : r.errors.join("; ")}`).toBe(true);
    }
  });

  it("never pre-fill a placeholder (YOUR_…, example addresses, sheet IDs)", () => {
    for (const d of dirs) {
      const m = JSON.parse(readFileSync(join(ROOT, d, "setup.json"), "utf8"));
      for (const s of m.settings) {
        if (typeof s.default === "string") expect(s.default, `${d} ${s.key}`).not.toMatch(/YOUR_|yourbusiness|yourcompany|example\.com|your-link/i);
      }
    }
  });

  it("cover every Settings value except the hidden technical ones", () => {
    const hidden = ["openAiModel", "openAiBaseUrl", "imageModel", "minImageKb", "metaVerifyToken"];
    for (const d of dirs) {
      const wf = JSON.parse(readFileSync(join(ROOT, d, "workflow.json"), "utf8"));
      const m = JSON.parse(readFileSync(join(ROOT, d, "setup.json"), "utf8"));
      const keys = settingsOf(wf).map((a) => a.name).filter((n) => !hidden.includes(n)).map((n) => n.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`));
      // Workflows with AI first ask which AI (it sets the hidden address and model).
      const expected = settingsOf(wf).some((a) => a.name === "openAiModel") ? ["ai_provider", ...keys] : keys;
      expect(m.settings.map((s: { key: string }) => s.key), d).toEqual(expected);
    }
  });
});

describe("personalized workflow download", () => {
  it("writes the answers into the Settings node with the right types and keeps the rest", async () => {
    const form = (await loadSetupForm("ai-lead-generation-follow-up"))!;
    const answers = validateConfig(form, {
      ai_provider: "openai", business_name: "Maison Lina", business_description: "Handmade bags.", ideal_customer: "Boutiques in Paris.",
      sender_name: "Lina", booking_link: "https://cal.com/lina", team_email: "lina@maisonlina.fr",
      google_sheet_url: "https://docs.google.com/spreadsheets/d/abc/edit", auto_send_replies: false, follow_up_days: 3, max_follow_ups: 2,
    });
    expect(answers.ok).toBe(true);
    if (!answers.ok) return;
    const out = (await personalizedWorkflow("ai-lead-generation-follow-up", answers.values, "cfg-1"))!;
    const s = Object.fromEntries(settingsOf(out.workflow as never).map((a) => [a.name, a.value]));
    expect(s).toMatchObject({
      businessName: "Maison Lina", teamEmail: "lina@maisonlina.fr", autoSendReplies: false, followUpDays: 3, maxFollowUps: 2,
      openAiModel: "gpt-4.1-mini", openAiBaseUrl: "https://api.openai.com/v1",
    });
    expect(out.workflow.active).toBe(false);
    expect(out.fileName).toBe("01-ai-lead-generation-follow-up.json");
    // Everything outside the Settings node is unchanged.
    const original = JSON.parse(readFileSync(join(ROOT, "01-ai-lead-generation-follow-up", "workflow.json"), "utf8"));
    expect(out.workflow.nodes.length).toBe(original.nodes.length);
    expect(JSON.stringify(out.workflow.nodes.filter((n) => n.name !== "Settings"))).toBe(JSON.stringify(original.nodes.filter((n: { name: string }) => n.name !== "Settings")));
  });

  it("gives each customer their own Meta verify token", async () => {
    const out = (await personalizedWorkflow("ai-social-media-automation", {}, "cfg-42"))!;
    const s = Object.fromEntries(settingsOf(out.workflow as never).map((a) => [a.name, a.value]));
    expect(s.metaVerifyToken).toBe(verifyToken("cfg-42"));
    expect(verifyToken("cfg-42")).not.toBe(verifyToken("cfg-43"));
  });

  it("refuses unknown slugs and path tricks", async () => {
    expect(await personalizedWorkflow("../package", {}, "x")).toBeNull();
    expect(await loadSetupForm("not-an-automation")).toBeNull();
  });

  it("lists the sheet tabs and accounts to connect", async () => {
    expect(await sheetTemplates("ai-lead-generation-follow-up")).toEqual([{ file: "leads-sheet.csv", tab: "Leads" }]);
    const creds = await credentialsUsed("ai-voice-receptionist");
    expect(creds).toEqual(expect.arrayContaining(["googleCalendarOAuth2Api", "googleSheetsOAuth2Api", "gmailOAuth2", "webhookHeaderAuth"]));
  });
});
