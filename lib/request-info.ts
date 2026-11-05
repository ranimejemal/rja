// Who is asking, from the request headers: IP address, country (set by Vercel), and a coarse device/browser read
// from the user agent. Used for the security log and the visit log. No dependency on server-only modules, so the
// middleware can use it too.

type HeaderSource = { get(name: string): string | null };

export function requestInfo(h: HeaderSource) {
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim().slice(0, 64) || null;
  const rawCountry = (h.get("x-vercel-ip-country") ?? "").toUpperCase();
  const userAgent = (h.get("user-agent") ?? "").slice(0, 300) || null;
  return { ip, country: /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null, userAgent, ...deviceOf(userAgent ?? "") };
}

export function deviceOf(ua: string): { device: "desktop" | "mobile" | "tablet" | "bot"; browser: string | null } {
  const device = /bot|crawl|spider|slurp|headless|curl|wget|python-requests|httpclient|scrapy|nmap|sqlmap|nikto|zgrab|masscan/i.test(ua) ? "bot"
    : /ipad|tablet|kindle|silk/i.test(ua) ? "tablet"
      : /mobi|iphone|android/i.test(ua) ? "mobile" : "desktop";
  const browser = /edg\//i.test(ua) ? "Edge" : /opr\/|opera/i.test(ua) ? "Opera" : /samsungbrowser/i.test(ua) ? "Samsung Internet"
    : /firefox|fxios/i.test(ua) ? "Firefox" : /chrome|crios/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari"
      : device === "bot" ? (ua.match(/^[\w.-]+/)?.[0]?.slice(0, 40) ?? "bot") : null;
  return { device, browser };
}

// Paths that only attackers and vulnerability scanners ask for on this site (it runs no PHP, WordPress or admin
// panels of that kind). Asking for one is logged as a probe and answered with a plain 404.
export const PROBE_PATHS = /^\/(wp-admin|wp-login|wp-content|wp-includes|xmlrpc\.php|phpmyadmin|pma|myadmin|adminer|\.env|\.git|\.aws|\.ssh|\.htaccess|\.htpasswd|\.DS_Store|config\.(php|json|yml)|server-status|cgi-bin|vendor\/phpunit|actuator|solr|boaform|HNAP1|owa|ecp|autodiscover|telescope|_profiler|debug|console|shell|backup|dump\.sql|db\.sql|database\.sql|.*\.(php|asp|aspx|jsp|cgi|env|bak|sql|ini|log))(\/|$)/i;
