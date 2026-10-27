/**
 * Public settings, safe in the browser. They default to the project's own Supabase values so a fresh deployment
 * (for example on Vercel) builds and runs before any environment variable is configured.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zdppasosborxodhglqwo.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_rh__ErC5aNGhBcG4f5_zKA_sk2SqxV0";

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
