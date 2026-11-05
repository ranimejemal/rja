import { describe, expect, it } from "vitest";
import { deviceOf, PROBE_PATHS, requestInfo } from "@/lib/request-info";

describe("visitor context", () => {
  it("reads device and browser from the user agent", () => {
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1")).toEqual({ device: "mobile", browser: "Safari" });
    expect(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0")).toEqual({ device: "desktop", browser: "Edge" });
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36")).toEqual({ device: "mobile", browser: "Chrome" });
    expect(deviceOf("sqlmap/1.8#stable (https://sqlmap.org)").device).toBe("bot");
    expect(deviceOf("Mozilla/5.0 (compatible; Googlebot/2.1)").device).toBe("bot");
  });

  it("takes the first forwarded IP and a valid country only", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1", "x-vercel-ip-country": "tn", "user-agent": "curl/8.0" });
    expect(requestInfo(h)).toMatchObject({ ip: "203.0.113.7", country: "TN", device: "bot" });
    expect(requestInfo(new Headers({ "x-vercel-ip-country": "Tunisia" })).country).toBeNull();
  });
});

describe("scan trap", () => {
  it("catches the paths attackers probe for", () => {
    for (const p of ["/wp-admin", "/wp-login.php", "/.env", "/.git/config", "/phpmyadmin/", "/index.php", "/backup.sql", "/vendor/phpunit/x", "/config.json"]) {
      expect(PROBE_PATHS.test(p), p).toBe(true);
    }
  });
  it("never catches the site's own pages", () => {
    for (const p of ["/", "/admin", "/admin/security", "/login", "/explore", "/products/ai-lead-generation-follow-up", "/api/track", "/dashboard/settings", "/legal/privacy", "/categories/e-commerce", "/help", "/sell", "/quote"]) {
      expect(PROBE_PATHS.test(p), p).toBe(false);
    }
  });
});
