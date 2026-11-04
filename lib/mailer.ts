import "server-only";
import nodemailer from "nodemailer";
import { env, features } from "@/lib/env";

// Outgoing email through the agency's own SMTP account (SMTP_* variables), e.g. the same Gmail app password as the
// Supabase auth emails. Without it, nothing is sent and callers are told so.

let transport: nodemailer.Transporter | null = null;

export async function sendMail(to: string, subject: string, html: string, text: string) {
  if (!features.email) return { ok: false as const, error: "email is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)" };
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT ?? 465, secure: (env.SMTP_PORT ?? 465) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  try {
    await transport.sendMail({ from: env.MAIL_FROM ?? `Ranime Jemal Agency <${env.SMTP_USER}>`, to, subject, html, text });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "send failed" };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const LOGO = "https://cdn.jsdelivr.net/gh/ranimejemal/rja@a531457953848db007120acded6f6a982a0074f5/public/email/rja-logo-white.png";

/** The branded email layout of the auth emails, for marketing and notification emails. */
export function brandedEmail({ title, paragraphs, cta, footerNote }: {
  title: string; paragraphs: string[]; cta?: { label: string; url: string }; footerNote?: string;
}) {
  const sans = "'Helvetica Neue',Helvetica,Arial,sans-serif";
  const mono = "'SFMono-Regular',Menlo,Consolas,'Courier New',monospace";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:#0e0e0d;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0e0e0d" style="background:#0e0e0d;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td style="padding:0 0 28px 4px;"><img src="${LOGO}" width="72" height="38" alt="RJA" style="display:block;border:0;width:72px;height:auto;color:#ffffff;font-family:Arial,sans-serif;font-size:24px;font-weight:700;"></td></tr>
<tr><td bgcolor="#171716" style="background:#171716;border:1px solid #2c2c29;border-radius:20px;padding:40px 36px;">
<h1 style="margin:0 0 16px;font-family:${sans};font-size:28px;line-height:1.2;font-weight:500;color:#f4f4ef;">${esc(title)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 16px;font-family:${sans};font-size:15px;line-height:1.6;color:#b9b9b2;">${esc(p)}</p>`).join("")}
${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;"><tr><td bgcolor="#c8ff3d" style="background:#c8ff3d;border-radius:999px;"><a href="${esc(cta.url)}" style="display:inline-block;padding:15px 32px;font-family:${mono};font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#1d1d1b;text-decoration:none;">${esc(cta.label)}</a></td></tr></table>` : ""}
</td></tr>
<tr><td style="padding:24px 4px 0;font-family:${sans};font-size:12px;line-height:1.7;color:#6f6f69;">Ranime Jemal Agency · AI automations and n8n workflows${footerNote ? `<br>${footerNote}` : ""}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [title, "", ...paragraphs, ...(cta ? ["", `${cta.label}: ${cta.url}`] : [])].join("\n");
  return { html, text };
}
