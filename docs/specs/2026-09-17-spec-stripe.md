# Technical Design Document (RFC): Stripe Checkout + Webhook — Invoice Pay Online (Hosted)

- **Author**: Assistant (this session) + user (owner, hosted checkout pain)
- **Status**: Draft (awaiting `pk:tasks` Task Record)
- **Created**: 2026-09-17
- **Target Release**: Milestone 7

---

## Planning Record (PromptKit Adaptation)

<a id="PLAN-stripe"></a>

> Level 2 (Controlled) — external integration + secrets + webhook + persistent Stripe IDs + hosted deploy. Full depth required.

### Planning Record Metadata

- **Planning Record ID [Required]**: `PLAN-stripe`
- **Planning Depth [Required]**: `Full`
- **Owner [Required]**: user (solo freelancer, M7 approver; wants hosted checkout to get paid)
- **Record Status [Required]**: `ready`
- **Local Task Record Link [Required for Controlled Work]**: `docs/tasks/TASK-2026-09-17-stripe.md#TASK-2026-09-17-stripe` (to be created by `pk:tasks`)
- **Workflow Links [Optional]**: `pk:plan` (this session) → `pk:tasks` → build M7.1–M7.4

### Planning Inputs

- **Requested Outcome [Required]**: Freelancer can click “Pay with Stripe” on an `UNPAID` invoice, be redirected to Stripe Checkout (hosted), pay with card, and have Stripe webhook `checkout.session.completed` mark the invoice `PAID` and post `Cash→AR` base journal automatically — no manual `Mark paid`.
- **Observable Completion Condition [Required]**: (1) `GET /invoices/[id]` shows “Pay with Stripe” when `UNPAID`; (2) clicking creates Checkout Session and redirects to `stripe.com/checkout`; (3) Stripe CLI `stripe trigger checkout.session.completed` hits `POST /api/stripe/webhook` with valid signature, returns `200`, invoice flips `UNPAID→PAID`, journal `Dr1000/Cr1200==baseTotal` posted, TB balanced; (4) replay of same webhook `id` returns `200` but does not create second journal (idempotent); (5) `53→62` tests still green + new Stripe idempotency tests green; `tsc`/`lint`/`build` green; hosted smoke passes both states.
- **Scope Boundary [Required]**: In scope — `Invoice` `stripeSessionId` + `stripePaymentIntentId`, `StripeEvent` dedup table, `src/lib/stripe.ts` (Stripe client + `createCheckoutSession`), `src/app/api/stripe/webhook/route.ts` (signature verify + handler), `src/actions/stripe.ts` `createCheckout`, `StripePayButton` on invoice page, `.env.example` `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` placeholders, hosted deploy checklist. Out of scope — Stripe Customer portal, subscriptions, partial payments, refunds, live FX in Checkout (uses invoice `baseTotalCents`), multi-currency presentment beyond M6, email/SMS receipts.
- **TDD Enforcement Proposal (Reference Only) [Optional]**: `disabled` (proposed; Task Record owns final mode).

### Full Planning

- **Explicit Non-Goals [Required in Full; Not applicable in Minimal]**: Subscriptions/recurring, refunds/chargebacks, Customer Portal billing updates, live FX via Stripe, Stripe Tax, Connect, Terminal, Radar custom rules, email of receipt beyond Stripe’s own, changing `JournalLine` to carry Stripe fees, local-only `bun dev` without hosted URL (M7 requires hosted).
- **Affected Behavioral Components [Required in Full; Not applicable in Minimal]**: (1) DB: `prisma/schema.prisma` `Invoice` Stripe IDs + `StripeEvent`; (2) Stripe domain: `src/lib/stripe.ts` (stripe-node client, `createCheckoutSession(invoice)`); (3) Webhook: `src/app/api/stripe/webhook/route.ts` (raw body, `stripe.webhooks.constructEvent`, `handleCheckoutCompleted`); (4) Actions: `src/actions/stripe.ts` `createCheckout(invoiceId)`; (5) UI: `src/components/StripePayButton.tsx` + invoice page `Pay with Stripe` when `UNPAID` + `markPaid` still for cash; (6) Config: `.env.example` + `next.config.ts` `turbopack.root` if needed for hosted, deployment docs.
- **Externally Visible Contracts [Required in Full; Not applicable in Minimal]**: No public API besides webhook. `POST /api/stripe/webhook` — raw `Stripe-Signature` header, `stripe.webhooks.constructEvent(payload, sig, secret)` → `200 {received:true}` or `400`. `createCheckout(invoiceId)` Server Action → `{ok:true, url: checkoutUrl}` or `{ok:false, error}`. Checkout Session: `amount = baseTotalCents` (USD cents), `currency: usd` (base), `client_reference_id: invoiceId`, `success_url: /invoices/[id]?paid=1`, `cancel_url: /invoices/[id]`. All Zod at action boundary; Stripe secrets via `process.env`.
- **Failure or Rollback Considerations [Required in Full; Not applicable in Minimal]**: Webhook replay handled by `StripeEvent.stripeId unique` + idempotent `markPaid` (uses `p-invoiceId` key, second call returns existing). Invalid signature → `400`, no DB write. Missing `client_reference_id` → `400`. Concurrent `checkout.session.completed` vs manual `Mark paid` → `ConflictError` (second wins via idempotencyKey, no double journal). Secrets hygiene: `.env` gitignored, `.env.example` placeholders only, never log raw `STRIPE_SECRET_KEY`. Rollback = revert code before migration is applied to hosted; additive Stripe columns → rolling back code without DB leaves `stripeSessionId` unused, harmless.
- **Verification Approach [Required in Full; Not applicable in Minimal]**: (1) Unit: `src/lib/stripe.test.ts` — `constructEvent` mock, `handleCheckoutCompleted` idempotency, `createCheckout` URL shape, invalid sig `400`; (2) Type: `bunx tsc --noEmit`; (3) Lint: `bun run lint`; (4) Build: `bun run build` with `POST /api/stripe/webhook`; (5) Smoke: Stripe CLI `stripe trigger checkout.session.completed --add checkout_session:client_reference_id=<invoiceId>` → invoice `PAID` + journal `Dr1000/Cr1200==base`, replay `200` no duplicate, `TB` balanced; (6) Regression: `bun test` 62+ new green, hosted auth still `307/200`.

### Assumption Records

<a id="ASSUMPTION-stripe-001"></a>
- **Assumption ID [Required]**: `ASSUMPTION-stripe-001`
- **Unanswered Decision [Required]**: Hosted deploy target.
- **Provisional Answer [Required]**: Vercel (Next.js 16.3 native) with `DATABASE_URL=file:./ledger.db` on ephemeral FS for M7 (acceptable for pilot), or `Turso libSQL` remote if persistence needed — M7 keeps `file:./ledger.db` and notes ephemeral risk.
- **Impact if Wrong [Required]**: If persistent hosted DB required, need `@libsql/client` remote URL + auth token migration.
- **Validation Action [Required]**: Confirm Vercel vs `bun dev` tunnel; reopen if Turso remote needed.
- **Decision Owner [Required]**: user
- **Status [Required]**: `accepted`
- **Supporting Evidence [Optional]**: `None`
- **Resolution Evidence [Not applicable until resolved]**: `N/A - unresolved`

<a id="ASSUMPTION-stripe-002"></a>
- **Assumption ID [Required]**: `ASSUMPTION-stripe-002`
- **Unanswered Decision [Required]**: Which invoices can be Stripe-paid.
- **Provisional Answer [Required]**: Only `UNPAID` invoices with `currency` any but `amount` = `baseTotalCents` (USD cents) in Checkout. `PAID`/`VOID` show no button. `DRAFT` not yet — must post first.
- **Impact if Wrong [Required]**: If `DRAFT` needs pay, need to auto-post on checkout — out of scope.
- **Validation Action [Required]**: Validate with pilot `EUR` invoice → base USD Checkout.
- **Decision Owner [Required]**: user
- **Status [Required]**: `accepted`
- **Supporting Evidence [Optional]**: `None`
- **Resolution Evidence [Not applicable until resolved]**: `N/A - unresolved`

<a id="ASSUMPTION-stripe-003"></a>
- **Assumption ID [Required]**: `ASSUMPTION-stripe-003`
- **Unanswered Decision [Required]**: Stripe keys availability.
- **Provisional Answer [Required]**: Test keys `sk_test_…` + `whsec_…` in local `.env` and hosted env, never in `.env.example` beyond `STRIPE_SECRET_KEY="sk_test_..."` placeholder.
- **Impact if Wrong [Required]**: If live keys needed, need live webhook + stricter secret rotation.
- **Validation Action [Required]**: Confirm test vs live before hosted cutover.
- **Decision Owner [Required]**: user
- **Status [Required]**: `accepted`
- **Supporting Evidence [Optional]**: `None`
- **Resolution Evidence [Not applicable until resolved]**: `N/A - unresolved`

### Technology and Vendor Decision Records

<a id="DECISION-stripe-001"></a>
#### Decision Record: `DECISION-stripe-001`

- **Decision ID [Required]**: `DECISION-stripe-001`
- **Decision Statement [Required]**: Select Stripe integration for Next.js 16.3 App Router + Prisma SQLite/libSQL — checkout creation + webhook handling.
- **Considered Options [Required]**: (A) `stripe@19.x` (stripe-node, stable) + `src/lib/stripe.ts` thin wrapper + raw `POST /api/stripe/webhook` with `stripe.webhooks.constructEvent`; (B) `next-stripe` / `use-stripe` helper; (C) Stripe `PaymentIntents` direct + custom card form.
- **Selected Option(s) [Required]**: (A) `stripe@19.x` official Node SDK (stable, no extra abstraction, App Router `route.ts` with `request.text()` raw body).
- **Rejected Option(s) [Required]**: (B) extra abstraction adds version churn, hides raw body handling needed for `constructEvent`; (C) custom card form → PCI SAQ A-EP vs Checkout SAQ A, more compliance cost.
- **Material Claim Links [Required]**: `[CLAIM-DECISION-stripe-001-001](#CLAIM-DECISION-stripe-001-001)`, `[CLAIM-DECISION-stripe-001-002](#CLAIM-DECISION-stripe-001-002)`
- **Remaining Uncertainty [Required]**: `None`
- **Decision Owner [Required]**: user
- **Status [Required]**: `decided`

##### Version Selection Fields

- **Version Selection Context [Required when versioned]**: `Existing project` (Next 16.3.5, Prisma 7.10.0, Bun 1.4.2) + greenfield for Stripe dep
- **AI Recommendation [Optional when versioned]**: `stripe@19.1.0` (stable, Node `stripe-node` latest 19.x)
- **Selected Exact Version(s) [Required when versioned]**: `stripe@19.1.0`
- **Release Channel [Required when versioned]**: `stable`
- **Support/Lifecycle Status [Required when versioned]**: `Active stable` (stripe-node 19.x current)
- **Compatibility Constraints [Required when versioned]**: Node 18+ (Bun compatible), Next App Router `route.ts` `export const runtime = "nodejs"`, raw body `await request.text()`, `STRIPE_SECRET_KEY` env
- **Version Rationale [Required when versioned]**: Latest stable 19.x for App Router + `constructEvent` raw body pattern; no prerelease.
- **Exact-Version Evidence [Required when versioned]**: Citation records below (accessed 2026-09-17)
- **Existing Version Baseline [Required for existing project]**: `next@16.3.5, prisma@7.10.0` preserved; Stripe is new pin
- **Decision Owner Approval or Accepted Assumption [Required]**: user, approved `decided` 2026-09-17
- **pk:spike or ADR Link [Optional]**: `None`

<a id="CLAIM-DECISION-stripe-001-001"></a>
#### Material Claim Record: `CLAIM-DECISION-stripe-001-001`

- **Claim ID [Required]**: `CLAIM-DECISION-stripe-001-001`
- **Decision Link [Required]**: `[DECISION-stripe-001](#DECISION-stripe-001)`
- **Material Claim [Required]**: `stripe@19.1.0` `stripe.webhooks.constructEvent(payload, sig, secret)` requires raw body `await request.text()` (not `request.json()`) on App Router `route.ts`.
- **Citation or Uncertainty Link [Required]**: `[CITATION-DECISION-stripe-001-001](#CITATION-DECISION-stripe-001-001)`

<a id="CITATION-DECISION-stripe-001-001"></a>
#### Citation Record: `CITATION-DECISION-stripe-001-001`

- **Citation ID [Required]**: `CITATION-DECISION-stripe-001-001`
- **Publisher [Required]**: Stripe
- **Document Title [Required]**: Stripe Webhooks — verifying signatures (Node)
- **Canonical URL [Required]**: https://docs.stripe.com/webhooks/signature
- **Access Date [Required]**: `2026-09-17`
- **Supported Claim Link [Required]**: `[CLAIM-DECISION-stripe-001-001](#CLAIM-DECISION-stripe-001-001)`
- **Citation Status [Required]**: `verified`

<a id="CLAIM-DECISION-stripe-001-002"></a>
#### Material Claim Record: `CLAIM-DECISION-stripe-001-002`

- **Claim ID [Required]**: `CLAIM-DECISION-stripe-001-002`
- **Decision Link [Required]**: `[DECISION-stripe-001](#DECISION-stripe-001)`
- **Material Claim [Required]**: Stripe Checkout Session with `amount = baseTotalCents` (integer cents) posts correct USD amount when `currency: usd` and uses `client_reference_id` to round-trip invoiceId.
- **Citation or Uncertainty Link [Required]**: `[CITATION-DECISION-stripe-001-002](#CITATION-DECISION-stripe-001-002)`

<a id="CITATION-DECISION-stripe-001-002"></a>
#### Citation Record: `CITATION-DECISION-stripe-001-002`

- **Citation ID [Required]**: `CITATION-DECISION-stripe-001-002`
- **Publisher [Required]**: Stripe
- **Document Title [Required]**: Checkout — create a Session (amount integer cents)
- **Canonical URL [Required]**: https://docs.stripe.com/api/checkout/sessions/create
- **Access Date [Required]**: `2026-09-17`
- **Supported Claim Link [Required]**: `[CLAIM-DECISION-stripe-001-002](#CLAIM-DECISION-stripe-001-002)`
- **Citation Status [Required]**: `verified`

---

## 1. Executive Summary & Problem Statement

M1–M6 ship a single-ledger, multi-currency (base USD) book behind an auth wall with browser-print receipts. The owner still manually marks invoices `PAID` after bank transfer and reconciles. M7 adds Stripe Checkout: click “Pay with Stripe” on an `UNPAID` invoice (any currency, amount is `base USD`), redirect to Stripe’s hosted Checkout, pay with card, and have `checkout.session.completed` webhook auto-mark `PAID` and post `Dr Cash / Cr AR` in base USD — no double journal on replay, TB stays balanced. Requires hosted deploy to receive Stripe’s webhook (local `bun dev` via tunnel is possible but M7 scopes to hosted).

---

## 2. Goals and Explicit Non-Goals

### Goals (In Scope)

- `Invoice` stores `stripeSessionId` + `stripePaymentIntentId` (nullable, unique on session id).
- `StripeEvent` dedup table: `stripeId unique`, `type`, `payload`, `processedAt`.
- `POST /api/stripe/webhook` — raw body + `Stripe-Signature` verify via `stripe.webhooks.constructEvent`; on `checkout.session.completed` extract `client_reference_id` (invoiceId), call idempotent `markPaid` with webhook `id` as idempotency key, record `StripeEvent`, return `200`. On replay, return `200` without second journal.
- `createCheckout(invoiceId)` Server Action — Zod `cuid`, `requireSession`, `UNPAID` check, `stripe.checkout.sessions.create({ line_items: [{ price_data: { currency: usd, unit_amount: baseTotalCents, product_data: { name: Invoice number }}, quantity:1 }], mode: payment, client_reference_id: invoiceId, success_url, cancel_url })`, then update `Invoice.stripeSessionId` and return `url`.
- `StripePayButton` on `GET /invoices/[id]` when `UNPAID` (and `!PAID`/`!VOID`) — “Pay with Stripe” → `createCheckout` → `window.location = url`.
- `.env.example` adds `STRIPE_SECRET_KEY="sk_test_..."` + `STRIPE_WEBHOOK_SECRET="whsec_..."` placeholders (`stripe@19.1.0`), hosted env instructions.
- Verification: `bun test` 62+ new Stripe idempotency/sig tests green, `tsc`/`lint`/`build` green, hosted Stripe CLI trigger `checkout.session.completed` marks `PAID` + journal, replay `200` no duplicate, TB balanced.

### Non-Goals (Explicit Scope Boundary)

- Subscriptions/recurring, Customer Portal, refunds/chargebacks, `payment_intent` direct card form (PCI), Stripe Tax, Radar custom rules, Connect.
- Live FX in Checkout beyond M6 `baseTotalCents` (Checkout stays `usd` `unit_amount = base USD`).
- Revaluation, gain/loss postings, or bank CSV multi-currency handling.
- Email/SMS receipt beyond Stripe’s own, or changing `JournalLine` to carry Stripe fees.
- Keeping `local-only` — M7 requires hosted to receive webhooks (tunnel is workable but scoped to hosted).

---

## 3. Architecture & System Context

### High-Level Architecture Diagram

```text
┌──────────┐  Pay click  ┌──────────────────┐ Stripe API ┌──────────┐
│ Browser  ├───────────►│ createCheckout   ├───────────►│ Stripe   │
│ /invoices│            │ Server Action    │  session   │ Checkout │
└────┬─────┘            └──────────────────┘            └────┬─────┘
     │  redirect URL                 │ webhook           card pay
     ▼                               ▼                     │
┌──────────┐            ┌──────────────────┐            │
│ Stripe   │            │ POST /api/stripe │◄───────────┘
│ Checkout │   302     │ /webhook         │  Sig verify
└──────────┘   back   └────────┬─────────┘  + StripeEvent dedup
     ▲   success_url            │ markPaid
     └──────────────────────────▼
                          ┌──────────┐  Dr Cash/Cr AR base
                          │ Invoice  ├────────────────►│ Journal │
                          │ PAID     │                 └────────┘
```

Idempotency: `StripeEvent.stripeId` unique + `markPaid` `idempotencyKey = "stripe-" + eventId`.

### Deep Module Decomposition & Seams

| Module / Seam | Public Interface / Boundary | Internal Complexity Hidden |
| :--- | :--- | :--- |
| **Stripe client** `lib/stripe.ts` | `stripe (Stripe)`, `createCheckoutSession(invoiceId, baseTotalCents)` | `stripe@19.1.0` init from `STRIPE_SECRET_KEY`, `unit_amount: baseTotalCents`, `client_reference_id`, `success/cancel_url` from `NEXT_PUBLIC_BASE_URL` |
| **Webhook route** `app/api/stripe/webhook/route.ts` | `POST(request: Request) => Response` | `await request.text()` raw, `stripe.webhooks.constructEvent`, `StripeEvent` dedup `upsert`, `checkout.session.completed` dispatch to `markPaid` with `stripeEvent.id` as idempotency, `400` on bad sig |
| **Checkout action** `actions/stripe.ts` | `createCheckout({invoiceId}) => {ok, url}|{ok:false}` | Zod `cuid`, `requireSession`, `UNPAID` guard, `stripe.checkout.sessions.create`, `db.invoice.update({stripeSessionId})` |
| **StripeEvent** `prisma` | `stripeId unique` | `type`, `payload JSON`, `processedAt`, dedup on replay |
| **StripePayButton** `components/StripePayButton.tsx` | `<StripePayButton invoiceId={…} />` | `createCheckout` call, `window.location`, pending/error, `aria-busy` |

Deletion test: removing `lib/stripe.ts` collapses Stripe init + `client_reference_id` + `unit_amount` mapping into action+route (single coherent place, not duplicated boilerplate) — kept separate only because `stripe` client is needed in both `createCheckout` and webhook verify and has independent test surface (sig verify mock).

---

## 4. Detailed Design & Contracts First

### 4.1 Data Models & Schemas

```prisma
model Invoice {
  // ... M6
  stripeSessionId     String? @unique
  stripePaymentIntentId String? // nullable, no unique needed (may be null until payment)
}

model StripeEvent {
  id        String   @id @default(cuid())
  stripeId  String   @unique // event.id e.g. evt_1O...
  type      String   // e.g. checkout.session.completed
  payload   String   // raw JSON string (or String @db.Text)
  createdAt DateTime @default(now())
  processedAt DateTime? // set when handled

  @@index([type])
  @@index([createdAt])
}
```

Options deferred: no `StripeCustomer`, no `Payment.amount_refunded`, no fee `balance_transaction`.

### 4.2 Zero-Downtime Migration Plan (Expand-Contract)

1. **Expand** (M7.1): `prisma migrate dev --name add_stripe` adds `Invoice.stripeSessionId` nullable unique + `StripeEvent` table. App still boots; old invoices have `null` (means “never Stripe-paid”).
2. **Read switch**: `createCheckout` writes `stripeSessionId`; webhook reads `StripeEvent.stripeId` for dedup.
3. **Backfill**: None required (existing `PAID` invoices stay `stripeSessionId null` — they were cash-paid).
4. **Contract**: None in M7 (no old column to drop). Future `stripeCustomerId` would follow Expand with nullable, then backfill.

- **Rollback Plan (RPO/RTO)**: If Stripe keys mis-configured, revert commit before hosted deploy; locally `prisma migrate reset` restores `ledger.db`. Additive Stripe columns → rolling back code without DB leaves `stripeSessionId` null/unused, harmless. Hosted RPO = last Turso/libSQL backup; RTO minutes.

### 4.3 API Endpoints & Zod Contracts

Webhook is the only public API (no auth — Stripe sig is auth). All other calls are Server Actions behind `requireSession`.

```typescript
// src/actions/stripe.ts
export const CreateCheckoutSchema = z.object({ invoiceId: z.string().cuid() });
export async function createCheckout(input: { invoiceId: string }):
  Promise<{ ok: true; url: string } | { ok: false; error: string }>;

// src/app/api/stripe/webhook/route.ts
// POST /api/stripe/webhook
// Header: Stripe-Signature: t=...,v1=...
// Body: raw Stripe Event JSON (not parsed beforehand)
// 200 { received: true } on handled or deduped
// 400 { error: "invalid signature" } on constructEvent failure
// Requires raw body: export const runtime = "nodejs"; body via await request.text()

// Stripe session create (lib/stripe.ts)
export async function createCheckoutSession(invoice: Invoice & { baseTotalCents: number }): Promise<string> {
  // stripe.checkout.sessions.create({
  //   mode: "payment",
  //   line_items: [{ price_data: { currency: "usd", unit_amount: invoice.baseTotalCents, product_data: { name: `Invoice ${invoice.number} — ${invoice.client.name}` } }, quantity: 1 }],
  //   client_reference_id: invoice.id,
  //   success_url: `${baseUrl}/invoices/${invoice.id}?paid=1`,
  //   cancel_url: `${baseUrl}/invoices/${invoice.id}`,
  // })
}
```

Money: `baseTotalCents` is integer USD cents (INV-02) — passed as `unit_amount` (Stripe also expects integer cents).

---

## 5. Security, Privacy & Failure Modes (FMEA)

### Security & Multi-Tenancy Audit

- **Webhook auth**: `Stripe-Signature` via `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)` — no `requireSession` (Stripe is caller). Invalid sig → `400`, no DB.
- **Input**: `createCheckout` Zod `cuid`, `requireSession`, `UNPAID` guard, `baseTotalCents>0`. Webhook `client_reference_id` must be `cuid` existing invoice.
- **Secrets & PII**: `STRIPE_SECRET_KEY`/`_WEBHOOK_SECRET` via env only, `.env` gitignored, `.env.example` placeholders `sk_test_…` / `whsec_…`, never logged. Invoice client email is PII already local-only, not sent to Stripe beyond `product_data.name` (owner’s own data).
- **Idempotency**: `StripeEvent.stripeId unique` + `markPaid` `p-stripe-<eventId>` — replay returns `200` no second journal.

### FMEA Resilience Matrix

| Failure Scenario | Probability / Severity | Detection Method | Mitigation / Fallback | Recovery Strategy |
| :--- | :--- | :--- | :--- | :--- |
| Invalid `Stripe-Signature` | High (probing) / Low | `400` count | `constructEvent` throws → `400` no DB | Stripe retries with backoff; fix secret |
| Duplicate webhook `evt_…` | Medium / Medium | `stripeId unique` violation | Upsert → return `200` without second `markPaid` | Idempotent, no double journal |
| `client_reference_id` missing/bad `cuid` | Low / Low | `400` | Zod `cuid` check → `400` | Fix invoice creation |
| Invoice already `PAID` (webhook vs manual `Mark paid` race) | Medium / Medium | `ConflictError` | `markPaid` same `p-stripe-<id>` returns existing `PAID` invoice | `200`, log race |
| `baseTotalCents` 0 or negative | Low / High | Zod `>0` at `createCheckout` | Fail closed, no Checkout Session | Fix invoice FX |
| Stripe API down at `createCheckout` | Low / Medium | `500` on action | Return `{ok:false, error}` toast | User retries after Stripe recovers |
| Hosted DB ephemeral loss (file on Vercel) | Low / High | `ledger.db` missing | M7 notes ephemeral risk; migrate to `libSQL` remote if needed | Restore from backup, or move to Turso |
| Raw body consumed as JSON before verify | Medium / High | `constructEvent` fails | Route uses `await request.text()` before any `json()` | Fix route |

---

## 6. Conditional Implementation Milestones

TDD Enforcement Mode: `disabled` (proposed; Task Record owns final). Dependency-ordered milestones; all `disabled` path.

- [ ] **M7.1 Schema + Stripe client (p0)** — `prisma/schema.prisma` `Invoice.stripe*` + `StripeEvent` + `migrate add_stripe`, `src/lib/stripe.ts` `stripe` init + `createCheckoutSession` helper + `stripe@19.1.0` + `.env.example` placeholders. Accepts: `prisma generate` + `tsc` clean.
- [ ] **M7.2 Checkout action + webhook (p0)** — `src/actions/stripe.ts` `createCheckout`, `src/app/api/stripe/webhook/route.ts` raw-body + `constructEvent` + `StripeEvent` dedup + `checkout.session.completed` → `markPaid` base, `export const runtime="nodejs"`. Accepts: `bun test` stripe sig/idempotency + `build` `POST /api/stripe/webhook`.
- [ ] **M7.3 Button + wiring (p1)** — `src/components/StripePayButton.tsx` + `src/app/invoices/[id]/page.tsx` `Pay with Stripe` when `UNPAID`, `InvoiceList` badge `Stripe` when `stripeSessionId`, preserve `Mark paid` for cash. Accepts: `build` green, authed smoke `Pay with Stripe` present/absent by status.
- [ ] **M7.4 Hardening + verify (p2)** — `tsc`/`lint`/`build` green, `grep -n STRIPE_` + `StripeEvent` audit, Stripe CLI smoke `trigger checkout.session.completed` → `PAID` + `Dr1000/Cr1200==base`, replay `200` no duplicate, TB balanced, hosted `PAYMENT` via webhook, `.env` hygiene, `requireSession` still on `createCheckout`.

### Sign-off Readiness

Milestones, acceptance (§2 + §4.3), review path (`pk:review` on request), and verification condition (§2) are recorded. This spec does not authorize commits — `pk:commit` needs explicit approval. Task Record at `docs/tasks/TASK-2026-09-17-stripe.md` must be created via `pk:tasks` before code.

---

## 7. Sign-off & Grilling Checklist

- [ ] Architecture challenged via `pk:grill` (recommended — webhook sig + idempotency + hosted ephemeral DB are high-risk).
- [ ] Zero-downtime database evolution verified (additive Stripe columns + StripeEvent, per §4.2).
- [ ] Non-goals agreed with stakeholder (no subs, no refunds, base USD only).
- [ ] Ready for Task Record milestone path (`disabled` proposed; Task Record owns final).

