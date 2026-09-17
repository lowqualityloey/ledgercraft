"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const res = await login({ email, password });
    setPending(false);
    if (res.ok) {
      router.push(next);
      router.refresh();
    } else if (res.error === "invalid_credentials") {
      setError("Invalid email or password.");
    } else {
      setError("Please enter a valid email and password (8+ chars).");
    }
  }

  return (
    <form
      action={onSubmit}
      className="flex flex-col gap-4 rounded border border-zinc-200 p-6 dark:border-zinc-800"
      noValidate
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={error ? "true" : undefined}
          className="rounded border border-zinc-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="owner@ledgercraft.local"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          aria-invalid={error ? "true" : undefined}
          className="rounded border border-zinc-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="••••••••"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-zinc-500">
        Seeded: owner@ledgercraft.local / accountant@ledgercraft.local
      </p>
    </form>
  );
}
