import { describe, expect, it, vi } from "vitest";
import { matchProblems } from "@/lib/troubleshoot";
import { errorOf, privateAddress, checkN8nUrl } from "@/lib/n8n-api";
import { loadSetupForm, personalizedWorkflow } from "@/lib/automations";
import { accountGuides } from "@/lib/setup-guide";
import { documentPart } from "../automations/src/logic.mjs";

vi.mock("node:dns/promises", () => ({
  lookup: async (host: string) => (host === "inside.example.org" ? [{ address: "10.0.0.5", family: 4 }] : [{ address: "93.184.216.34", family: 4 }]),
}));

type Assignment = { name: string; value: unknown };
const settingsOf = (wf: { nodes: { name: string; parameters: Record<string, unknown> }[] }) =>
  (wf.nodes.find((n) => n.name === "Settings")!.parameters.assignments as { assignments: Assignment[] }).assignments;
const value = (list: Assignment[], name: string) => list.find((a) => a.name === name)?.value;

describe("known problems", () => {
  it("recognises the errors customers really hit", () => {
    expect(matchProblems("The service is receiving too many requests... 503 Service Unavailable, model is overloaded")[0].id).toBe("ai-overloaded");
    expect(matchProblems("Bad request - Missing or invalid Authorization header")[0].id).toBe("wrong-credential-type");
    expect(matchProblems("Authorization failed - please check your credentials")[0].id).toBe("ai-auth");
    expect(matchProblems("models/gemini-2.5-flash is no longer available to new users")[0].id).toBe("ai-model");
    expect(matchProblems("You exceeded your current quota, please check your plan and billing details")[0].id).toBe("openai-no-credit");
    expect(matchProblems("Problem submitting response")[0].id).toBe("form-test");
    expect(matchProblems("Sheet with name Leads not found")[0].id).toBe("sheet-not-found");
    expect(matchProblems("hello, how are you")).toEqual([]);
  });
});

describe("n8n connection safety", () => {
  it("refuses internal addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "::ffff:10.0.0.1", "0.0.0.0"]) {
      expect(privateAddress(ip), ip).toBe(true);
    }
    expect(privateAddress("93.184.216.34")).toBe(false);
  });

  it("accepts only public https n8n addresses", async () => {
    expect(await checkN8nUrl("https://shop.app.n8n.cloud/home/workflows")).toEqual({ ok: true, base: "https://shop.app.n8n.cloud" });
    for (const bad of ["http://shop.app.n8n.cloud", "https://127.0.0.1", "https://localhost", "https://inside.example.org", "https://a:b@shop.app.n8n.cloud", "https://shop.app.n8n.cloud:5678", "not a url"]) {
      expect((await checkN8nUrl(bad)).ok, bad).toBe(false);
    }
  });

  it("reads the error of a failed run", () => {
    const e = errorOf({ resultData: { lastNodeExecuted: "Score the lead with AI", error: { message: "Authorization failed", description: "Incorrect API key", node: { name: "Score the lead with AI" } } } });
    expect(e).toEqual({ node: "Score the lead with AI", message: "Authorization failed — Incorrect API key" });
    expect(errorOf(null).message).toMatch(/failed/);
  });
});

describe("choice of AI", () => {
  it("is the first question of every form that uses AI, free Gemini by default", async () => {
    const form = (await loadSetupForm("ai-lead-generation-follow-up"))!;
    expect(form.settings[0]).toMatchObject({ key: "ai_provider", type: "select", default: "gemini" });
    expect((await loadSetupForm("website-uptime-incident-notifier"))!.settings.some((s) => s.key === "ai_provider")).toBe(false);
  });

  it("writes the chosen AI's address and model into the download", async () => {
    const gem = settingsOf((await personalizedWorkflow("ai-social-media-automation", { ai_provider: "gemini", generate_images: true }, "c"))!.workflow);
    expect(value(gem, "openAiBaseUrl")).toBe("https://generativelanguage.googleapis.com/v1beta/openai");
    expect(value(gem, "openAiModel")).toBe("gemini-flash-latest");
    expect(value(gem, "generateImages")).toBe(false);
    const oai = settingsOf((await personalizedWorkflow("ai-social-media-automation", { ai_provider: "openai", generate_images: true }, "c"))!.workflow);
    expect(value(oai, "openAiBaseUrl")).toBe("https://api.openai.com/v1");
    expect(value(oai, "generateImages")).toBe(true);
  });

  it("shows the matching account step", () => {
    expect(accountGuides("ai-lead-generation-follow-up", ["openAiApi"], "u", "gemini")[0].steps).toMatch(/aistudio\.google\.com.*[\s\S]*v1beta\/openai/);
    expect(accountGuides("ai-lead-generation-follow-up", ["openAiApi"], "u", "openai")[0].steps).toMatch(/platform\.openai\.com/);
  });

  it("sends PDFs to Gemini as inline data", () => {
    expect(documentPart("application/pdf", "AAA", "a.pdf", "https://generativelanguage.googleapis.com/v1beta/openai").type).toBe("image_url");
    expect(documentPart("application/pdf", "AAA", "a.pdf", "https://api.openai.com/v1").type).toBe("file");
  });
});
