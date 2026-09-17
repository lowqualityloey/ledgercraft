import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, validateSession } from "./auth";

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSession(token);
}

export async function requireSession(next?: string) {
  const session = await getSession();
  if (session) return session;
  const suffix = next ? `?next=${encodeURIComponent(next)}` : "";
  redirect(`/login${suffix}`);
}
