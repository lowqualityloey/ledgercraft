# LedgerCraft

Double-entry bookkeeping for freelancers, with a login in front of every page.

You keep a chart of accounts, record journal entries that must balance, raise
invoices for clients, import bank statements from CSV, and take payment through
Stripe Checkout. The app is "local-first": you run it on your own machine
against a SQLite file, and production runs the same code against a hosted libSQL
database (Turso) so that data survives redeploys.

**Status:** milestones M1–M7 are shipped. `bun test` passes **82 tests across 8
files**, and `bun run build` compiles **13 routes**.

## What it does

| Milestone | What you can do |
| :--- | :--- |
| **M1** Core ledger | Keep a chart of accounts (15 seeded), post balanced journal entries, and read a trial balance and profit & loss report. |
| **M2** Clients & invoices | Keep a client list, raise invoices that move `UNPAID` → `PAID`, and correct mistakes with reversing entries rather than edits. |
| **M3** CSV import | Import a bank statement as CSV. Rows are fingerprinted so re-importing the same file does not double-post, and each row posts to Cash plus the offset account you choose. |
| **M4** Receipts | Print an invoice receipt from `/invoices/[id]`. |
| **M5** Accounts & login | Sign in with an email and password, with 7-day sessions and every page behind the login wall. |
| **M6** Multi-currency | Work in USD, EUR, GBP, JPY, CAD or AUD. Rates are stored as basis points and amounts as integer cents, so no money ever passes through a floating-point number. |
| **M7** Stripe | Pay an unpaid invoice through Stripe Checkout, with a signature-verified and idempotent webhook marking it paid. |

There is no sign-up flow. Accounts are created by the seed script (see
[Signing in](#signing-in)).

### Guardrails the app enforces

These are the rules the code defends, and each one is covered by tests:

- **A journal entry must balance.** If debits and credits disagree, the entry is
  rejected and nothing is written — not a partial write, nothing.
- **Money is never a float.** Every amount is an integer count of cents, and
  currency conversion rounds explicitly.
- **The ledger is append-only.** A posting is never edited or deleted; a
  correction is a new, linked reversing entry.
- **Every page requires a session.** There is no anonymous or shared mode.
- **Posting is idempotent.** Repeating a request with the same key returns the
  original entry instead of creating a second one.

## How a journal entry gets posted

The layers are kept deliberately separate: the form never talks to the database,
and the domain code never talks to the UI. Here is what happens when you post a
single journal entry.

1. **The form** (`src/components/JournalForm.tsx`) holds the entry in local state
   — a date, a description, and at least two lines, each with an account and a
   debit *or* a credit. It converts what you type into cents using the same
   helpers the server uses (`src/lib/money.ts`), so the
   `Dr 1,500.00 = Cr 1,500.00 ✓ balanced` readout is not an approximation, and the
   submit button stays disabled until the entry balances.
2. **The server action** (`src/actions/ledger.ts`, `createJournal`) is the server
   entry point. It calls `requireSession()` first, so an unauthenticated request
   cannot reach the ledger, then converts the typed dollars to integer cents,
   attaches a fresh idempotency key, and passes the result to the domain layer.
   Errors come back as a message on the form rather than a failed request.
3. **The domain layer** (`src/lib/ledger.ts`, `postJournal`) is where the rules
   live — its own comment calls it the place for "all balance, atomicity, and
   reversal rules". It validates the input against `PostJournalSchema`
   (`src/lib/journal.ts`) *before* opening a transaction, so an unbalanced entry
   writes nothing at all, and it then confirms every referenced account exists.
4. **The write** happens inside a single `$transaction`: the entry and all of its
   lines are created together, so a partially written entry cannot happen. If the
   same idempotency key arrives twice, the unique constraint rejects the second
   attempt and the original entry is returned instead of a duplicate.
5. **The database** is reached through one Prisma client (`src/lib/db.ts`) built
   on the libSQL adapter, which resolves to the local SQLite file or the hosted
   database depending on the environment (see the next section).

| Layer | File | Responsibility |
| :--- | :--- | :--- |
| Form | `src/components/JournalForm.tsx` | Collect input and show a live balance; never decide correctness |
| Server action | `src/actions/ledger.ts` | Auth, unit conversion, idempotency key, error shaping |
| Domain | `src/lib/ledger.ts`, `src/lib/journal.ts` | Validation, balance, atomicity, reversal |
| Data access | `src/lib/db.ts`, `src/lib/datasource.ts` | One client, local or hosted |

Three consequences worth knowing. The balance rule is enforced **twice** — in the
browser for immediate feedback, and on the server as the authority — so disabling
JavaScript or hand-crafting a request cannot post an unbalanced entry. Corrections
follow the same path: `reverseEntry` appends an inverted, linked copy and refuses
to reverse the same entry twice, so the original row is never edited or deleted.
And the trial balance and profit & loss reports are **computed from the posted
lines** each time they are read; there are no stored running totals, so a report
cannot drift out of step with the ledger.

## How an invoice gets paid

A Stripe payment reaches the same ledger by a different route, and it has to
survive something a form never does: **Stripe delivers the same event more than
once**, and it cannot hold a session.

1. **The button** (`src/components/StripePayButton.tsx`) calls the
   `createCheckout` server action and then sends the browser to the URL Stripe
   returns. A failure is shown inline instead of redirecting.
2. **Opening the checkout** (`src/actions/stripe.ts`) requires a session, refuses
   any invoice that is not `UNPAID`, and creates a Stripe Checkout session
   (`src/lib/stripe.ts`) for `baseTotalCents` in USD. That session carries
   `client_reference_id = <invoice id>` — the only thread tying the payment back
   to the ledger — and the returned session id is saved on the invoice. A missing
   or placeholder `STRIPE_SECRET_KEY` produces a readable message rather than a
   crash.
3. **The webhook** (`src/app/api/stripe/webhook/route.ts`) is the one route left
   outside the login wall, because Stripe cannot hold a session. It authenticates
   by **signature** instead: it reads the raw request body (signature checking
   needs the unparsed bytes), verifies it against `STRIPE_WEBHOOK_SECRET`, and
   answers `400` to anything that fails — so a forged request cannot mark an
   invoice paid. It also checks that `client_reference_id` looks like a real id
   before trusting it.
4. **A repeat delivery must change nothing**, and there are three separate guards
   for it. The event id is written to `StripeEvent` *before* any work happens and
   the handler exits early if that row is already stamped `processedAt`; an
   invoice that is already `PAID` is reported as such without acting; and the
   ledger key is derived from the event id (`stripe-<event id>`), so a retry can
   never post a second payment.
5. **The ledger change** happens in `markPaid` (`src/lib/invoicing.ts`). One
   transaction creates a balanced entry — **debit Cash, credit Accounts
   Receivable**, both for the base total — and flips the invoice to `PAID` with
   `paymentEntryId` pointing at that entry. A payment is therefore an ordinary
   journal entry, indistinguishable in the reports from one typed by hand.

| Layer | File | Responsibility |
| :--- | :--- | :--- |
| Button | `src/components/StripePayButton.tsx` | Start checkout, show failures |
| Server action | `src/actions/stripe.ts` | Auth, eligibility, session id on the invoice |
| Stripe client | `src/lib/stripe.ts` | Build the session; verify the signature |
| Webhook | `src/app/api/stripe/webhook/route.ts` | Authenticate by signature, dedupe, dispatch |
| Domain | `src/lib/invoicing.ts` (`markPaid`) | Post the payment entry and set `PAID` |

Three consequences worth knowing. The `success_url` is **decorative**: nothing in
the app reads its `?paid=1`, and an invoice becomes paid only when the signed
webhook arrives — so editing the URL in the address bar achieves nothing. (One
side effect of that: there is no post-payment confirmation screen, because the
buyer simply lands back on the invoice, which the webhook has usually already
flipped to `PAID`.) Only an `UNPAID` invoice can be paid, so a `VOID` or `DRAFT`
invoice cannot be resurrected by a payment. And event types the app does not
handle are recorded and acknowledged with `200`, which is deliberate: returning
an error would make Stripe retry forever.

## Run it locally

You need [Bun](https://bun.sh) installed. From the project root:

```bash
bun install
bunx prisma generate                                  # build the Prisma client into src/generated
DATABASE_URL="file:./ledger.db" bunx prisma migrate deploy   # create the local database
bun prisma/seed.ts                                    # 15 accounts + the two demo users
bun dev                                               # http://localhost:3000/login
```

Then check your work the way CI does:

```bash
bun test          # 82 tests
bun run typecheck # tsc --noEmit
bun run lint      # eslint
bun run build     # next build, 13 routes
```

Two details in that first block are worth knowing. The database file,
`ledger.db`, is **not** committed — the `migrate deploy` line is what creates it,
so a fresh clone starts empty. And that line needs the explicit
`DATABASE_URL="file:./ledger.db"` because the Prisma CLI cannot read a
`libsql://` URL and `prisma7.config.ts` only loads `.env`.

`bun run build` runs `prisma generate` first on purpose: the generated client
lives in `src/generated`, which is gitignored, so a build without that step fails
with `Module not found`.

## How the database is chosen

`.env` points at the **hosted** database. That is what Vercel reads, and what you
want for any by-hand operation against production. Local development and tests
are kept away from it by two committed mode files, with an optional per-machine
override on top:

| File | Committed? | Used by | Contains |
| :--- | :--- | :--- | :--- |
| `.env` | no | Vercel, manual remote work | the hosted `libsql://` URL and token |
| `.env.development` | **yes** | `bun dev`, `next dev` | `DATABASE_URL="file:./ledger.db"` |
| `.env.test` | **yes** | `bun test` | `DATABASE_URL="file:./ledger.db"` |
| `.env.local` | no | every mode | your local overrides |
| `.env.development.local` | no | `bun dev`, `next dev` | your machine's override |
| `.env.test.local` | no | `bun test` | your machine's override |

Later files win, so the precedence is `.env` → `.env.<mode>` → `.env.local` →
`.env.<mode>.local`. An environment variable you export in your shell outranks
all of them.

Because the first two mode files are committed, **a fresh clone cannot point
development or tests at the hosted ledger** — not even if `.env` holds a live
`libsql://` URL. This matters more than it sounds: the test suite drives the real
Prisma client and creates and deletes users and sessions, so a test run against
production would write real fixtures into it. `.env.example` lists the full
placeholder set:

```
DATABASE_URL="file:./ledger.db"
AUTH_SECRET="change-me-in-prod-32-chars-min"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

## Deploying to Vercel

Production lives at **https://ledgercraft-ivory.vercel.app**. The project is
git-connected, so the normal way to ship is simply:

```bash
git push origin main   # Vercel builds and aliases Production, usually in ~30s
```

`vercel --prod` still works if you want a deploy straight from your machine, but
it is not the usual path.

Production and Preview each need their own environment variables, set in Vercel
under **Settings → Environment Variables**:

```
DATABASE_URL=libsql://<db>-<org>.turso.io
DATABASE_AUTH_TOKEN=<token>
NEXT_PUBLIC_BASE_URL=https://ledgercraft-ivory.vercel.app
STRIPE_SECRET_KEY=<key>
STRIPE_WEBHOOK_SECRET=<secret>
```

**Migrations are applied differently in the hosted environment.** Prisma's CLI
cannot talk to a `libsql://` URL (it fails with `P1013: The scheme is not
recognized in database URL`), so migrations are applied over `@libsql/client`
from the SQL files in `prisma/migrations/*/migration.sql`.

**Stripe** needs an endpoint pointed at
`https://ledgercraft-ivory.vercel.app/api/stripe/webhook`, subscribed to
`checkout.session.completed`, whose signing secret goes in
`STRIPE_WEBHOOK_SECRET`. For local work, `stripe listen --forward-to
localhost:3000/api/stripe/webhook` prints a `whsec_…` you can use instead. If
`STRIPE_SECRET_KEY` is still the `sk_test_...` placeholder, the app shows a
friendly "Stripe not configured" message rather than failing.

## Operations

| Task | Where |
| :--- | :--- |
| Check your work | `bun test` · `bun run typecheck` · `bun run lint` · `bun run build` |
| Deploy | `git push origin main` |
| Hosted database token | **expires `2026-12-21T13:07Z`** — rotation runbook in `docs/STATE.md` §5 |
| Expiry alarm | `.github/workflows/db-token-expiry.yml` runs daily and starts failing on **2026-12-07**, 14 days out, emailing whoever last touched the workflow |
| Incidents and live state | `docs/rca/` and `docs/STATE.md` |

Two things to know before touching auth or the hosted credentials, both learned
the hard way:

- **The middleware runs on the edge and cannot query the database.** It can see
  that a cookie exists, but not whether the session behind it is still valid, so
  it must never treat a cookie as proof of authentication — only a page can
  validate a session. Inferring auth from cookie *presence* once produced an
  infinite `/` ⇄ `/login` loop, which the browser reported as
  `ERR_TOO_MANY_REDIRECTS`. `src/middleware.test.ts` pins the correct behaviour.
- **Vercel pins environment variables per deployment.** Changing a credential
  does nothing to deployments that already exist, so rotating the database token
  means redeploying **both** Production and Preview. Redeploying only Production
  silently leaves Preview broken.

## Tests

`bun test` runs 82 tests across 8 files. The suite uses the real Prisma client
against the local database file, not mocks, which is why the committed `.env.test`
that pins it to `file:./ledger.db` is load-bearing.

| File | Tests | Covers |
| :--- | :--- | :--- |
| `src/lib/invoicing.test.ts` | 17 | Invoices, payments, voids and reversals |
| `src/lib/csvImport.test.ts` | 14 | CSV parsing, fingerprinting, draft posting |
| `src/lib/datasource.test.ts` | 13 | Which database URL is used, and token handling |
| `src/lib/money.test.ts` | 9 | Cents parsing, formatting and FX conversion |
| `src/lib/auth.test.ts` | 9 | Password hashing, sessions, expiry |
| `src/middleware.test.ts` | 7 | Routing and the login wall, including stale cookies |
| `src/lib/ledger.test.ts` | 7 | Balanced posting, idempotency, reversals |
| `src/lib/journal.test.ts` | 6 | Journal entry rules |

## Signing in

| Email | Password |
| :--- | :--- |
| `owner@ledgercraft.local` | `owner-pass-123` |
| `accountant@ledgercraft.local` | `acct-pass-12345` |

These are development credentials created by `prisma/seed.ts`, not secrets.

## Routes

Every route is dynamic (`ƒ`, rendered per request) except the 404 page, because
all of them depend on the session:

`/` `/accounts` `/clients` `/imports` `/invoices` `/invoices/[id]` `/journal`
`/login` `/profit-loss` `/trial-balance` `/api/stripe/webhook` `/_not-found`

That is 12 app routes plus the `Proxy (Middleware)` entry, making 13 in the build
output. Without a session, every page redirects to `/login` — except `/login`
itself and the 404 page — while the Stripe webhook authenticates by request
signature rather than by cookie.

## Built with

Next.js 16.3.5 · React 19.2.8 · TypeScript (strict) · Bun 1.4.2 · Prisma 7.10.0
with `@prisma/adapter-libsql` · SQLite locally and libSQL in production ·
Tailwind 4 · bcryptjs for password hashing · Stripe 19.1.0 · zod for validation.

## Project layout

| Path | What lives there |
| :--- | :--- |
| `src/app/` | Routes and pages (App Router) |
| `src/actions/` | Server actions — the write path for ledger, invoicing, imports and Stripe |
| `src/components/` | Forms and UI pieces |
| `src/lib/` | Domain logic: money, ledger, journal, invoicing, CSV import, auth, sessions, database, Stripe |
| `src/middleware.ts` | Routing and the login wall |
| `prisma/` | Schema, six migrations, and the seed script |
| `src/generated/` | Prisma client, gitignored and rebuilt by `prisma generate` |
| `docs/` | Live project state (`STATE.md`), ADRs, specs and post-mortems |

## Later ledger

Everything planned has shipped: invoicing, CSV import, PDF receipts, auth,
multi-currency and Stripe. Hosted persistence is done too — the hosted libSQL
database replaced an earlier per-instance `/tmp` file whose writes did not
survive cold starts. Next up: Stripe live keys, and FX revaluation.

## License

Local-only pilot, no license yet.
