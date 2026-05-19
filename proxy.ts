import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Edge middleware (Next 16 calls it `proxy`). Two responsibilities:
//
// 1) Hostname-based rewrite — `calendar.entheios.com/*` serves the
//    /calendar/* route at the domain root. The booking page is public
//    (no auth) so we short-circuit out before the session check.
//
// 2) Auth gate — gate every other route except /login, /verify,
//    /api/auth/*, and static assets behind a valid session cookie.

const PUBLIC_PATHS = new Set<string>(["/login"]);

export async function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  // (1) Hostname rewrite for the booking subdomain.
  if (host.startsWith("calendar.")) {
    // Skip static assets, Next internals, and already-rewritten paths.
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/calendar") ||
      pathname === "/favicon.ico" ||
      pathname === "/logo.png" ||
      pathname === "/icon.png"
    ) {
      return NextResponse.next();
    }
    const rewritten = req.nextUrl.clone();
    rewritten.pathname = `/calendar${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(rewritten);
  }

  // The /calendar route exists only to back calendar.entheios.com. Block
  // direct access from any other host (app.entheios.com, preview URLs, etc.)
  // so this booking surface is reachable only at the dedicated subdomain.
  if (pathname.startsWith("/calendar")) {
    return new NextResponse(null, { status: 404 });
  }

  // (2) Auth gate for the main app.
  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/cal/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/logo.png" ||
    pathname === "/icon.png"
  ) {
    return NextResponse.next();
  }

  const tok = req.cookies.get("atlas_session")?.value;
  if (!tok) return redirectToLogin(req);

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    await jwtVerify(tok, secret);
    return NextResponse.next();
  } catch {
    return redirectToLogin(req);
  }
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
