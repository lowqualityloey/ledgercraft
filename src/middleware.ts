import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ledgercraft_session" as const;

const PUBLIC_PATHS = new Set<string>(["/login", "/favicon.ico"]);
const PROTECTED_PREFIXES = [
  "/",
  "/accounts",
  "/journal",
  "/clients",
  "/invoices",
  "/imports",
  "/trial-balance",
  "/profit-loss",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.match(/\.(css|js|png|svg|ico|woff2?)$/)) return true;
  return false;
}

function isProtected(pathname: string): boolean {
  if (pathname === "/") return true;
  return PROTECTED_PREFIXES.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)),
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authed = Boolean(token);

  if (isPublicPath(pathname)) {
    // Deliberately NO "already signed in -> redirect away from /login" branch here.
    // The middleware can only see that a cookie is *present*, never whether the
    // session behind it is still valid (no database access on the edge). Bouncing
    // on presence alone therefore contradicts the login page's own validated check
    // and the two ping-pong forever: /login -> / -> /login -> ... which the browser
    // aborts as ERR_TOO_MANY_REDIRECTS. A stale cookie (expired session, or a row
    // removed) left users unable to reach the sign-in form at all.
    // `src/app/login/page.tsx` performs this redirect *after* validating the
    // session, so it is the single authoritative check.
    return NextResponse.next();
  }

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  if (!authed) {
    const url = new URL("/login", request.url);
    const next = `${pathname}${search}`;
    if (next !== "/login") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
