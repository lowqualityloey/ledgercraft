"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/actions/auth";

export function LogoutButton({ email }: { email?: string }) {
  const router = useRouter();
  async function onClick() {
    await logout();
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Sign out"
      className="rounded border border-zinc-200 px-3 py-1 text-xs hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-zinc-800"
    >
      Sign out{email ? ` (${email})` : ""}
    </button>
  );
}
