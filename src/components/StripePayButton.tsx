"use client";

import { useState } from "react";
import { createCheckout } from "@/actions/stripe";

export function StripePayButton({ invoiceId }: { invoiceId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    const res = await createCheckout({ invoiceId });
    if (!res.ok) {
      setError(res.error);
      setPending(false);
      return;
    }
    window.location.href = res.url;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={pending}
        aria-busy={pending}
        className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
      >
        {pending ? "Redirecting…" : "Pay with Stripe"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
