import type { MetadataRoute } from "next";

// Search engines may index the shop, not the private areas (admin, accounts, API).
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/seller", "/api/", "/login/mfa", "/reset-password", "/verify", "/unsubscribe"] }] };
}
