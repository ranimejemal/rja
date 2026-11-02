import type { NextConfig } from "next";

const securityHeaders = [
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
