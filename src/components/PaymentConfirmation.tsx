"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Stripe redirects the buyer here the moment they pay, and its webhook usually
// lands around the same time — sometimes after. So this banner treats the
// `?paid=1` query parameter as a *hint* and the invoice status as the truth: it
// never claims a payment the ledger has not recorded. While the webhook is still
// in flight it says so, and re-checks a few times before handing back a manual
// refresh.
const MAX_AUTO_CHECKS = 3;
const CHECK_DELAY_MS = 2000;

export function PaymentConfirmation({
  status,
  number,
}: {
  status: string;
  number: string;
}) {
  const router = useRouter();
  const checks = useRef(0);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (status === "PAID") return;
    if (checks.current >= MAX_AUTO_CHECKS) {
      setGaveUp(true);
      return;
    }
    const timer = setTimeout(() => {
      checks.current += 1;
      router.refresh();
    }, CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, router]);

  if (status === "PAID") {
    return (
      <p
        role="status"
        className="no-print rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
      >
        <strong>Payment received.</strong> {number} is marked paid, and a payment
        entry has been posted to the ledger.
      </p>
    );
  }

  return (
    <div
      role="status"
      className="no-print flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      <p>
        {gaveUp
          ? `No payment has been recorded for ${number} yet. If you have just paid, refresh in a moment.`
          : "Confirming your payment — this page will update on its own."}
      </p>
      <button
        type="button"
        onClick={() => {
          checks.current = 0;
          setGaveUp(false);
          router.refresh();
        }}
        className="rounded border border-amber-400 px-2 py-1 text-xs font-medium hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-amber-700 dark:hover:bg-amber-900"
      >
        Refresh
      </button>
    </div>
  );
}
