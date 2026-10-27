import { z } from "zod";

// A product's configuration manifest lists the settings a buyer may change. It describes a form;
// it is never executed. Values are validated against it on the client and again on the server.

const key = z.string().regex(/^[a-z][a-z0-9_]{0,48}$/, "keys are lowercase letters, digits and underscores");
const label = z.string().min(1).max(80);
const help = z.string().max(300).optional();

const option = z.object({ label: z.string().min(1).max(80), value: z.string().min(1).max(80) });

const setting = z.discriminatedUnion("type", [
  z.object({ key, label, help, type: z.literal("text"), required: z.boolean().default(false), maxLength: z.number().int().min(1).max(500).default(200), default: z.string().optional() }),
  z.object({ key, label, help, type: z.literal("textarea"), required: z.boolean().default(false), maxLength: z.number().int().min(1).max(4000).default(2000), default: z.string().optional() }),
  z.object({ key, label, help, type: z.literal("email"), required: z.boolean().default(false), default: z.email().optional() }),
  z.object({ key, label, help, type: z.literal("url"), required: z.boolean().default(false), default: z.url().optional() }),
  z.object({ key, label, help, type: z.literal("number"), required: z.boolean().default(false), min: z.number().optional(), max: z.number().optional(), default: z.number().optional() }),
  z.object({ key, label, help, type: z.literal("boolean"), required: z.boolean().default(false), default: z.boolean().optional() }),
  z.object({ key, label, help, type: z.literal("select"), required: z.boolean().default(false), options: z.array(option).min(1).max(50), default: z.string().optional() }),
  z.object({ key, label, help, type: z.literal("multiselect"), required: z.boolean().default(false), options: z.array(option).min(1).max(50), default: z.array(z.string()).optional() }),
]);

export const manifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    productType: z.enum(["n8n-workflow"]),
    workflowVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    settings: z.array(setting).max(40),
  })
  .strict()
  .superRefine((m, ctx) => {
    const seen = new Set<string>();
    m.settings.forEach((s, i) => {
      if (seen.has(s.key)) ctx.addIssue({ code: "custom", path: ["settings", i, "key"], message: `duplicate key "${s.key}"` });
      seen.add(s.key);
    });
  });

export type Manifest = z.infer<typeof manifestSchema>;
export type ManifestSetting = Manifest["settings"][number];
export type ConfigValues = Record<string, string | number | boolean | string[]>;

export function parseManifest(input: unknown): { ok: true; manifest: Manifest } | { ok: false; errors: string[] } {
  const r = manifestSchema.safeParse(input);
  if (r.success) return { ok: true, manifest: r.data };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join(".") || "manifest"}: ${i.message}`) };
}

function fieldSchema(s: ManifestSetting): z.ZodType {
  switch (s.type) {
    case "text":
    case "textarea": {
      const base = z.string().trim().max(s.maxLength);
      return s.required ? base.min(1, `${s.label} is required`) : base.optional();
    }
    case "email":
      return s.required ? z.email(`${s.label} must be an email address`) : z.union([z.email(), z.literal("")]).optional();
    case "url":
      return s.required ? z.url({ protocol: /^https?$/ }) : z.union([z.url({ protocol: /^https?$/ }), z.literal("")]).optional();
    case "number": {
      let n = z.number({ message: `${s.label} must be a number` });
      if (s.min !== undefined) n = n.min(s.min);
      if (s.max !== undefined) n = n.max(s.max);
      return s.required ? n : n.optional();
    }
    case "boolean":
      return s.required ? z.boolean() : z.boolean().optional();
    case "select": {
      const values = s.options.map((o) => o.value) as [string, ...string[]];
      return s.required ? z.enum(values) : z.union([z.enum(values), z.literal("")]).optional();
    }
    case "multiselect": {
      const values = s.options.map((o) => o.value) as [string, ...string[]];
      const arr = z.array(z.enum(values)).max(values.length);
      return s.required ? arr.min(1, `Choose at least one ${s.label}`) : arr.optional();
    }
  }
}

/**
 * Validates buyer values against the manifest. Unknown keys are rejected, so a buyer can never set
 * anything the creator did not declare (no node code, expressions or credentials).
 */
export function validateConfig(manifest: Manifest, values: unknown):
  { ok: true; values: ConfigValues } | { ok: false; errors: Record<string, string> } {
  const shape: Record<string, z.ZodType> = {};
  manifest.settings.forEach((s) => (shape[s.key] = fieldSchema(s)));
  const r = z.object(shape).strict().safeParse(values);
  if (r.success) {
    const clean: ConfigValues = {};
    for (const [k, v] of Object.entries(r.data as Record<string, unknown>)) {
      if (v !== undefined && v !== "") clean[k] = v as ConfigValues[string];
    }
    return { ok: true, values: clean };
  }
  const errors: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const field = issue.code === "unrecognized_keys" ? issue.keys.join(", ") : String(issue.path[0] ?? "form");
    errors[field] = issue.code === "unrecognized_keys" ? "This setting cannot be changed" : issue.message;
  }
  return { ok: false, errors };
}

/** Converts submitted form fields (all strings) into typed values before validation. */
export function coerceFormValues(manifest: Manifest, form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of manifest.settings) {
    if (s.type === "boolean") out[s.key] = form.get(s.key) === "on";
    else if (s.type === "multiselect") out[s.key] = form.getAll(s.key).map(String);
    else if (s.type === "number") {
      const raw = String(form.get(s.key) ?? "").trim();
      if (raw !== "") out[s.key] = Number(raw);
    } else {
      const raw = form.get(s.key);
      if (raw !== null) out[s.key] = String(raw);
    }
  }
  return out;
}
