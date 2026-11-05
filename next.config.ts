import type { NextConfig } from "next";

// Content Security Policy: the browser only loads scripts, images, fonts and connections from the sources the site
// really uses, so injected code cannot pull in or send data to anything else (OWASP: XSS and data exfiltration).
const SUPABASE = "https://zdppasosborxodhglqwo.supabase.co";
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${SUPABASE} https://cdn.jsdelivr.net https://d2ol7oe51mr4n9.cloudfront.net`,
  "media-src 'self' blob: https://d2ol7oe51mr4n9.cloudfront.net",
  `connect-src 'self' ${SUPABASE} https://d2ol7oe51mr4n9.cloudfront.net https://challenges.cloudflare.com`,
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "zdppasosborxodhglqwo.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  // The agency's automations (workflow, setup form, sheet templates, guide) are read from the repository at runtime.
  outputFileTracingIncludes: {
    "/api/configurations/[id]/workflow": ["./automations/*/workflow.json"],
    "/api/automations/[slug]/sheets/[file]": ["./automations/*/*.{csv,json}"],
    "/dashboard/products/[id]": ["./automations/*/*.{json,csv,md}"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
