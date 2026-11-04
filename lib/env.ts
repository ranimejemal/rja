import "server-only";
import { z } from "zod";
import { SITE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./public-env";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  NEXT_PUBLIC_SITE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  QUOTE_WEBHOOK_URL: z.url().optional(),
  // Outgoing email (promotions, notifications), e.g. Gmail: smtp.gmail.com, 465, your address, an app password.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
});

const parsed = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: SITE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || undefined,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || undefined,
  QUOTE_WEBHOOK_URL: process.env.QUOTE_WEBHOOK_URL || undefined,
  SMTP_HOST: process.env.SMTP_HOST || undefined,
  SMTP_PORT: process.env.SMTP_PORT || undefined,
  SMTP_USER: process.env.SMTP_USER || undefined,
  SMTP_PASS: process.env.SMTP_PASS || undefined,
  MAIL_FROM: process.env.MAIL_FROM || undefined,
});

export const env = parsed;

/** Features that need server secrets are switched off until the secrets are configured. */
export const features = {
  serverAdmin: Boolean(parsed.SUPABASE_SERVICE_ROLE_KEY),
  payments: Boolean(parsed.STRIPE_SECRET_KEY && parsed.STRIPE_WEBHOOK_SECRET && parsed.SUPABASE_SERVICE_ROLE_KEY),
  email: Boolean(parsed.SMTP_HOST && parsed.SMTP_USER && parsed.SMTP_PASS),
};
