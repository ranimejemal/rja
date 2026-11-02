"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { coerceFormValues, validateConfig, type ConfigValues, type Manifest } from "@/lib/manifest";
import { saveConfiguration, type ConfigState } from "@/app/dashboard/products/[id]/actions";
import { SubmitButton } from "./client";

/** Form generated from the creator's manifest. Validated here for fast feedback and again on the server. */
export function ConfigForm({ productId, manifest, initial, workflowDownload = false }: {
  productId: string; manifest: Manifest; initial?: ConfigValues;
  /** The product has a personalized workflow file: offer it as soon as the answers are saved. */
  workflowDownload?: boolean;
}) {
  const [state, action] = useActionState<ConfigState, FormData>(saveConfiguration, {});
  const router = useRouter();
  // Show what depends on the saved answers (the download button) right away.
  useEffect(() => { if (state.ok) router.refresh(); }, [state, router]);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const errors = { ...state.errors, ...clientErrors };

  return (
    <form
      action={action}
      noValidate
      className="stack"
      onSubmit={(e) => {
        const r = validateConfig(manifest, coerceFormValues(manifest, new FormData(e.currentTarget)));
        if (!r.ok) { e.preventDefault(); setClientErrors(r.errors); } else setClientErrors({});
      }}
    >
      <input type="hidden" name="product_id" value={productId} />
      {manifest.settings.map((s) => {
        const id = `cfg-${s.key}`;
        const err = errors[s.key];
        const value = initial?.[s.key] ?? s.default;
        const common = { id, name: s.key, "aria-invalid": err ? true : undefined, "aria-describedby": err ? `${id}-err` : s.help ? `${id}-help` : undefined };
        return (
          <div key={s.key} className="field">
            {s.type === "boolean" ? (
              <label className="check"><input type="checkbox" {...common} defaultChecked={Boolean(value)} /> {s.label}</label>
            ) : (
              <label htmlFor={id}>{s.label}{s.required && <span aria-hidden="true"> *</span>}</label>
            )}
            {s.type === "text" && <input {...common} maxLength={s.maxLength} defaultValue={value as string | undefined} required={s.required} />}
            {s.type === "textarea" && <textarea {...common} maxLength={s.maxLength} defaultValue={value as string | undefined} required={s.required} />}
            {s.type === "email" && <input {...common} type="email" defaultValue={value as string | undefined} required={s.required} />}
            {s.type === "url" && <input {...common} type="url" defaultValue={value as string | undefined} required={s.required} />}
            {s.type === "number" && <input {...common} type="number" min={s.min} max={s.max} defaultValue={value as number | undefined} required={s.required} />}
            {s.type === "select" && (
              <select {...common} defaultValue={(value as string | undefined) ?? ""} required={s.required}>
                <option value="">Choose…</option>
                {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {s.type === "multiselect" && (
              <div className="badges" role="group" aria-labelledby={id}>
                {s.options.map((o) => (
                  <label key={o.value} className="check small"><input type="checkbox" name={s.key} value={o.value} defaultChecked={Array.isArray(value) && value.includes(o.value)} /> {o.label}</label>
                ))}
              </div>
            )}
            {s.help && <span id={`${id}-help`} className="hint">{s.help}</span>}
            {err && <span id={`${id}-err`} className="error">{err}</span>}
          </div>
        );
      })}
      {state.message && (
        <div className={`notice ${state.ok ? "ok" : "danger"}`} role="status">
          {state.message}
          {state.ok && state.configId && workflowDownload && (
            <> <a className="btn small accent" style={{ marginLeft: "0.5rem" }} href={`/api/configurations/${state.configId}/workflow`}>Download my automation</a></>
          )}
        </div>
      )}
      <SubmitButton className="btn accent" pendingText="Saving…">Save my details</SubmitButton>
    </form>
  );
}
