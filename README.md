# LedgerCraft

Rock-solid double-entry bookkeeping for freelancers — local-first, auth-gated, multi-currency, Stripe Checkout.

`M1–M7` shipped, now on a hosted ledger — `75/75` `bun test`, `tsc`/`lint`/`build` `13` routes `ƒ /api/stripe/webhook` + `Proxy`. Local dev/test stay on `file:./ledger.db`; Production/Preview use hosted libSQL (Turso) so writes survive cold starts.

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

Invariants: `INV-01` balanced fail-closed, `INV-02` integer cents + `convertCents` no float, `INV-03` append-only, `INV-04` evolved to auth wall (`file:./ledger.db` for local dev/test → hosted `libsql://` on Vercel).

## Stack

`Next 16.3.5` `React 19` `TypeScript strict` `Bun 1.4.2` `Prisma 7.10.0` `SQLite/libSQL` `@prisma/adapter-libsql@7.10.0` `@libsql/client@^0.18` `Tailwind 4` `bcryptjs@3.0.3` `stripe@19.1.0` `zod@4.6.5`.

## Quick start (local)

```bash
bun install
bunx prisma generate
DATABASE_URL="file:./ledger.db" bunx prisma migrate deploy # creates ledger.db on a fresh clone (the file is no longer committed)
bun prisma/seed.ts # CoA 15 + owner@ledgercraft.local / owner-pass-123 + accountant@ledgercraft.local / acct-pass-12345
bun dev --port 3000 # http://localhost:3000/login
bun test # 75 pass
bunx tsc --noEmit; bun run lint; bun run build # 13 routes incl. ƒ /api/stripe/webhook + Proxy
```

`ledger.db` is the local dev/test database: gitignored and **no longer tracked** (it was force-committed only for the retired `/tmp` deploy copy), so it stays out of `git status`. The `migrate deploy` line above is what builds it — the explicit `file:` `DATABASE_URL` matters because the Prisma CLI cannot read `libsql://` and `prisma7.config.ts` loads only `.env`. Hosted environments use a remote libSQL URL instead.

## Env

`.env` holds the **hosted** libSQL URL + token (Vercel, and any by-hand remote op). Local runs are kept off it by two gitignored override files, because Next.js and Bun both load them *after* `.env` (and above `.env.local`, which `vercel env pull` rewrites):

| File | Used by | Value |
| :--- | :--- | :--- |
| `.env.development.local` | `bun dev` | `DATABASE_URL="file:./ledger.db"` |
| `.env.test.local` | `bun test` | `DATABASE_URL="file:./ledger.db"` |

Delete either file to point that mode back at the hosted DB. Note an **exported** `DATABASE_URL` in your shell outranks every `.env*` file. `.env.example` has the full placeholder set:

```
DATABASE_URL="file:./ledger.db" # local default; hosted: libsql://<db>-<org>.turso.io + DATABASE_AUTH_TOKEN
AUTH_SECRET="change-me-in-prod-32-chars-min"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_BASE_URL="http://localhost:3000" # hosted: https://ledgercraft-ivory.vercel.app
```

## Hosted (Vercel)

`https://ledgercraft-ivory.vercel.app` `● Ready` `55er…` (`6f89f42`).

```bash
vercel login
vercel --prod # this project is NOT git-connected: deploys only happen via the CLI
# Vercel Dashboard → Settings → Environment Variables (Production + Preview)
# DATABASE_URL=libsql://<db>-<org>.turso.io, DATABASE_AUTH_TOKEN, NEXT_PUBLIC_BASE_URL=https://ledgercraft-ivory.vercel.app, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
```

Hosted schema: Prisma's CLI cannot talk to `libsql://` (`P1013`), so migrations are applied over `@libsql/client` from `prisma/migrations/*/migration.sql`.

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

All shipped: `M2` invoicing, `M3` CSV, `M4` PDF, `M5` auth, `M6` multi-currency, `M7` Stripe. Hosted persistence shipped too — Turso `libsql://` replaced the per-lambda `/tmp` file. Next: `Stripe` live cutover, FX revaluation.

## License

Local-only pilot, no license yet.
