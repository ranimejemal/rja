import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/public-env";
import { PROBE_PATHS, requestInfo } from "@/lib/request-info";
import { writeSecurityEvent } from "@/lib/security-log";

// Refreshes the Supabase session cookie and sends signed-out visitors to the login page for private areas.
// Pages and actions check access again on the server, so if Supabase can't be reached the request goes through
// rather than taking the whole site down.
export async function middleware(request: NextRequest) {
  // Scanners looking for WordPress, PHP, .env files and the like: plain 404, and a note in the security log.
  if (PROBE_PATHS.test(request.nextUrl.pathname)) {
    const info = requestInfo(request.headers);
    await writeSecurityEvent({
      kind: "probe", severity: "medium", ip: info.ip, country: info.country, userAgent: info.userAgent,
      path: request.nextUrl.pathname + request.nextUrl.search.slice(0, 100), details: { method: request.method },
    });
    return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const privatePath = /^\/(dashboard|seller|admin|checkout)(\/|$)/.test(request.nextUrl.pathname);
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasSession) return privatePath ? toLogin(request) : NextResponse.next();

  let response = NextResponse.next({ request });
  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    if (privatePath && !data.user) return toLogin(request);
  } catch (error) {
    console.error("Session refresh failed", error);
  }
  return response;
}

function toLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|images/|email/|favicon.ico|api/webhooks).*)"],
};
