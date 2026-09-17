# LedgerCraft

Rock-solid double-entry bookkeeping for freelancers — local-first, auth-gated, multi-currency, Stripe Checkout.

`M1–M7` shipped at `v0.7.0` (`d83073c` + `ca8d043` `file:/tmp` fix) — `62/62` `bun test`, `tsc`/`lint`/`build` `12` routes `ƒ /api/stripe/webhook` + `Proxy`.

## Features

| Milestone | What |
| :--- | :--- |
| M1 Core | CoA `15` (`1000` Cash, `4000` Income…), balanced `Dr==Cr` journal (`INV-01`), `TB`/`P&L`, `17` tests |
| M2 Invoicing | `Client` + `Invoice` `UNPAID→PAID`, `VOID` via reversals (`INV-03`), `30` tests |
| M3 CSV Import | `parseCsv` + `fingerprint` + `postDrafts` (`Cash 1000` + offset), `14` tests |
| M4 PDF Receipt | `GET /invoices/[id]` + `InvoiceReceipt` + `@media print` `PrintButton`, `10` routes |
| M5 Auth | `User`/`Session` `bcryptjs@3.0.3` opaque `64hex` `7d` `httpOnly` `SameSite Lax` `Secure` `Proxy` `307` + `/login`, `53` tests |
| M6 Multi | `Currency` `USD/EUR/GBP/JPY/CAD/AUD` + `fxRateBps` `10000=1.00` + `convertCents` integer `Math.round(c*fx/10000)` + dual `EUR 200.00 → USD 230.00`, `62` tests |
| M7 Stripe | `Invoice.stripeSessionId` + `StripeEvent` `stripe@19.1.0` `createCheckout` `unit_amount=baseTotalCents` `usd` `client_reference_id` + `POST /api/stripe/webhook` raw `constructEvent` + `p-stripe-<evt>` idempotency + `Pay with Stripe` on `UNPAID` |

Invariants: `INV-01` balanced fail-closed, `INV-02` integer cents + `convertCents` no float, `INV-03` append-only, `INV-04` evolved to auth wall (`file:./ledger.db` local → `file:/tmp/ledger.db` on Vercel).

## Stack

`Next 16.3.5` `React 19` `TypeScript strict` `Bun 1.4.2` `Prisma 7.10.0` `SQLite/libSQL` `@prisma/adapter-libsql@7.10.0` `@libsql/client@^0.18` `Tailwind 4` `bcryptjs@3.0.3` `stripe@19.1.0` `zod@4.6.5`.

## Quick start (local)

```bash
bun install
bunx prisma generate
bun prisma/seed.ts # CoA 15 + owner@ledgercraft.local / owner-pass-123 + accountant@ledgercraft.local / acct-pass-12345
bun dev --port 3000 # http://localhost:3000/login
bun test # 62 pass
bunx tsc --noEmit; bun run lint; bun run build # 12 routes incl. ƒ /api/stripe/webhook + Proxy
```

`ledger.db` is gitignored locally but **force-committed** for Vercel (`file:/tmp/ledger.db` copy at runtime `src/lib/db.ts:6`).

## Env

`.env` (gitignored) — `.env.example` has placeholders:

```
DATABASE_URL="file:./ledger.db" # local; on Vercel: file:/tmp/ledger.db
AUTH_SECRET="change-me-in-prod-32-chars-min"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_BASE_URL="http://localhost:3000" # hosted: https://ledgercraft-ivory.vercel.app
```

## Hosted (Vercel)

`https://ledgercraft-ivory.vercel.app` `● Ready` `55er…` (`ca8d043`).

```bash
vercel login
vercel --prod # auto-deploys main
# Vercel Dashboard → Settings → Environment Variables (Production)
# DATABASE_URL=file:/tmp/ledger.db, AUTH_SECRET, NEXT_PUBLIC_BASE_URL=https://ledgercraft-ivory.vercel.app, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
```

Stripe Dashboard `Add endpoint` `https://ledgercraft-ivory.vercel.app/api/stripe/webhook` → `checkout.session.completed` → `whsec_…`. For local: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (prints `whsec_…`).

`src/lib/stripe.ts:4` shows friendly `Stripe not configured — set STRIPE_SECRET_KEY…` when placeholder `sk_test_...`/`whsec_...` is still in `.env` (click `Pay with Stripe` with no keys).

## Demo logins

| Email | Password |
| :--- | :--- |
| `owner@ledgercraft.local` | `owner-pass-123` |
| `accountant@ledgercraft.local` | `acct-pass-12345` |

## Routes (all behind `Proxy` `307` → `/login` when unauthed)

`/` `/_not-found` `/accounts` `/clients` `/imports` `/invoices` `ƒ /invoices/[id]` `/journal` `ƒ /login` `/profit-loss` `/trial-balance` `ƒ /api/stripe/webhook` `ƒ Proxy (Middleware)`.

## Later ledger

All shipped: `M2` invoicing, `M3` CSV, `M4` PDF, `M5` auth, `M6` multi-currency, `M7` Stripe — none remaining. Next: `Turso libsql://` for persistent hosted DB (`/tmp` is per-lambda), `Stripe` live cutover, FX revaluation.

## License

Local-only pilot, no license yet.
