"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientAction } from "@/actions/invoicing";

export function ClientForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    setPending(true);
    const res = await createClientAction({ name, email, notes });
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to create client");
      return;
    }
    setName("");
    setEmail("");
    setNotes("");
    router.refresh();
  }

  return (
    <form
      aria-label="New client"
      className="rounded border border-zinc-200 p-4 dark:border-zinc-800"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            type="text"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Co"
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="billing@acme.co"
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Notes
          <input
            type="text"
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Retainer, Net 30"
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!name.trim() || !email.trim() || pending}
        className="mt-4 rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-black"
      >
        {pending ? "Saving…" : "Add client"}
      </button>
    </form>
  );
}
