import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

const BASE = "https://ledgercraft.test";
const COOKIE = "ledgercraft_session";

function req(path: string, sessionValue?: string): NextRequest {
  const headers = new Headers();
  if (sessionValue !== undefined) headers.set("cookie", `${COOKIE}=${sessionValue}`);
  return new NextRequest(new URL(path, BASE), { headers });
}

/** The redirect target as a path (with query), or null when the request is allowed through. */
function redirectTo(res: Response): string | null {
  const loc = res.headers.get("location");
  if (!loc) return null;
  const url = new URL(loc, BASE);
  return `${url.pathname}${url.search}`;
}

describe("middleware", () => {
  test("sends a cookie-less request for a protected path to /login with next", () => {
    expect(redirectTo(middleware(req("/journal")))).toBe("/login?next=%2Fjournal");
  });

  test("preserves the query string in next so the redirect is page-level, not middleware", () => {
    expect(redirectTo(middleware(req("/journal?probe=x")))).toBe(
      "/login?next=%2Fjournal%3Fprobe%3Dx",
    );
  });

  test("allows /login through when there is no cookie", () => {
    expect(redirectTo(middleware(req("/login")))).toBeNull();
  });

  test("allows _next static assets and api routes through", () => {
    expect(redirectTo(middleware(req("/_next/static/chunk.js")))).toBeNull();
    expect(redirectTo(middleware(req("/api/stripe/webhook")))).toBeNull();
  });

  // Regression: the middleware used to bounce /login -> / whenever the cookie was
  // merely *present*, while the login page (validating properly) bounced / -> /login.
  // A stale cookie therefore ping-ponged forever and the browser reported
  // ERR_TOO_MANY_REDIRECTS, making the app unreachable. Presence is not validity:
  // only the page can validate, so the middleware must never redirect on it.
  test("does NOT bounce /login to / on cookie presence alone", () => {
    expect(redirectTo(middleware(req("/login", "stale-garbage")))).toBeNull();
  });

  test("does NOT treat an unvalidated cookie as authenticated on protected paths", () => {
    expect(redirectTo(middleware(req("/", "stale-garbage")))).toBeNull();
    expect(redirectTo(middleware(req("/accounts", "stale-garbage")))).toBeNull();
  });

  test("a stale cookie terminates instead of looping between / and /login", () => {
    // Models BOTH layers, which is what makes the loop: the middleware sees only
    // cookie presence, while the page validates the session and sends a dead one
    // to /login. Presence-based bouncing makes those two disagree forever.
    // Testing the middleware alone cannot catch this — the chain only ends when
    // the page is allowed to render, so the page layer is simulated here.
    const pageRedirects = (path: string): string | null =>
      path.startsWith("/login") ? null : "/login";

    let path = "/";
    const hops: string[] = [];
    for (let i = 0; i < 6; i++) {
      const mw = redirectTo(middleware(req(path, "stale-garbage")));
      const dest = mw ?? pageRedirects(path);
      hops.push(`${path} -> ${dest ?? "(rendered)"}`);
      if (!dest) break;
      path = dest.split("?")[0];
    }

    expect(hops.at(-1)).toContain("(rendered)");
  });
});
