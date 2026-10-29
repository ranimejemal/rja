"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Submit button that shows a pending state while the server action runs. */
export function SubmitButton({ children, className = "btn", pendingText = "Working…" }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * Button that asks for confirmation in a dialog before submitting its form.
 * Used for destructive or financially consequential actions.
 */
export function ConfirmSubmit({ children, title, message, className = "btn", confirmLabel = "Confirm", name, value }: {
  children: ReactNode; title: string; message: ReactNode; className?: string; confirmLabel?: string; name?: string; value?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const submitter = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" className={className} ref={button} onClick={() => dialog.current?.showModal()}>{children}</button>
      {/* Hidden real submit button, so name/value are sent like a normal button click. It stays disabled,
          so pressing Enter in a field can never submit the form without the confirmation. */}
      <button type="submit" ref={submitter} name={name} value={value} hidden disabled tabIndex={-1} aria-hidden="true" />
      <dialog ref={dialog} aria-labelledby="confirm-title">
        <div className="stack">
          <h2 id="confirm-title" className="h3">{title}</h2>
          <div className="muted small">{message}</div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn ghost small" onClick={() => dialog.current?.close()}>Cancel</button>
            <button
              type="button"
              className="btn danger small"
              onClick={() => {
                dialog.current?.close();
                const s = submitter.current;
                if (!s) return;
                s.disabled = false;
                button.current?.closest("form")?.requestSubmit(s);
                s.disabled = true;
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** Shows a toast for ?notice= / ?error= messages set after a redirect, then removes them from the URL. */
export function Toast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const notice = params.get("notice");
  const error = params.get("error");
  const [visible, setVisible] = useState(Boolean(notice || error));
  useEffect(() => {
    if (!notice && !error) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      const next = new URLSearchParams(params);
      next.delete("notice");
      next.delete("error");
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    }, 6000);
    return () => clearTimeout(t);
  }, [notice, error, params, pathname, router]);
  if (!visible || (!notice && !error)) return null;
  return <div className={`notice toast ${error ? "danger" : "ok"}`} role={error ? "alert" : "status"}>{error ?? notice}</div>;
}

/** Password field with a show/hide button. */
export function PasswordInput({ id, name, autoComplete, minLength = 10 }: { id: string; name: string; autoComplete: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} required minLength={minLength} maxLength={128} />
      <button type="button" className="password-toggle" onClick={() => setVisible((v) => !v)} aria-controls={id} aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}>
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
