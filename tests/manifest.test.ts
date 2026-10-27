import { describe, expect, it } from "vitest";
import { coerceFormValues, parseManifest, validateConfig } from "@/lib/manifest";

const specExample = {
  schemaVersion: 1,
  productType: "n8n-workflow",
  workflowVersion: "1.0.0",
  settings: [
    { key: "business_name", label: "Business name", type: "text", required: true },
    { key: "notification_email", label: "Notification email", type: "email", required: true },
    {
      key: "lead_source", label: "Lead source", type: "select", required: true,
      options: [{ label: "Website form", value: "website" }, { label: "CRM", value: "crm" }],
    },
  ],
};

function manifest() {
  const r = parseManifest(specExample);
  if (!r.ok) throw new Error(r.errors.join("; "));
  return r.manifest;
}

describe("parseManifest", () => {
  it("accepts the example from the product spec", () => {
    expect(parseManifest(specExample).ok).toBe(true);
  });
  it("rejects unknown top-level fields and duplicate keys", () => {
    expect(parseManifest({ ...specExample, execute: "rm -rf /" }).ok).toBe(false);
    const dup = { ...specExample, settings: [specExample.settings[0], specExample.settings[0]] };
    const r = parseManifest(dup);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/duplicate key/);
  });
  it("rejects unsupported setting types such as code", () => {
    const bad = { ...specExample, settings: [{ key: "js", label: "Code", type: "code" }] };
    expect(parseManifest(bad).ok).toBe(false);
  });
});

describe("validateConfig", () => {
  it("accepts valid values", () => {
    const r = validateConfig(manifest(), { business_name: "Acme", notification_email: "ops@acme.test", lead_source: "crm" });
    expect(r).toEqual({ ok: true, values: { business_name: "Acme", notification_email: "ops@acme.test", lead_source: "crm" } });
  });
  it("rejects missing required values and invalid options", () => {
    const r = validateConfig(manifest(), { business_name: "", notification_email: "nope", lead_source: "fax" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["business_name", "lead_source", "notification_email"]);
  });
  it("rejects settings the creator did not declare", () => {
    const r = validateConfig(manifest(), {
      business_name: "Acme", notification_email: "ops@acme.test", lead_source: "crm", nodes: [{ type: "n8n-nodes-base.executeCommand" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.nodes).toBe("This setting cannot be changed");
  });
  it("coerces form fields to typed values", () => {
    const m = parseManifest({
      schemaVersion: 1, productType: "n8n-workflow", workflowVersion: "1.0.0",
      settings: [
        { key: "threshold", label: "Threshold", type: "number", min: 0, max: 100 },
        { key: "notify", label: "Notify", type: "boolean" },
      ],
    });
    if (!m.ok) throw new Error();
    const fd = new FormData();
    fd.set("threshold", "70");
    fd.set("notify", "on");
    const values = coerceFormValues(m.manifest, fd);
    expect(values).toEqual({ threshold: 70, notify: true });
    expect(validateConfig(m.manifest, { threshold: 150 }).ok).toBe(false);
  });
});
