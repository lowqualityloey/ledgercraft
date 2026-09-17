# Task Record: Milestone 7 — Stripe Checkout + Webhook (Base USD, Hosted)

<a id="TASK-2026-09-17-stripe"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-17-stripe`
- **PromptKit Adaptation Profile**: `none` (legacy dated ID preserved)
- **Work Type**: `Code Work`
- **Planning Record Link**: `[PLAN-stripe](../specs/2026-09-17-spec-stripe.md#PLAN-stripe)`
- **Planning Depth Reference**: `Full`
- **Assumption Record Links**: `[ASSUMPTION-stripe-001, ASSUMPTION-stripe-002, ASSUMPTION-stripe-003](../specs/2026-09-17-spec-stripe.md#PLAN-stripe)` (all accepted, owner: user)
- **Specification**: `docs/specs/2026-09-17-spec-stripe.md`
- **External Reference (Optional)**: `N/A`
- **Owner / Actor**: `user (solo freelancer, M7 approver)`
- **Execution Scope**: `Repository standalone (single Next.js app + local SQLite → hosted)`
- **Approval Boundary**: `Commits need explicit approval; no push without remote + approval; scope expansion needs Scope Change Record`
- **Created**: `2026-09-17 UTC`

> This Local Task Source is authoritative for Controlled Work. Planning/Assumption links are context only.

## 2. Objective and Boundaries

- **Objective**: `UNPAID` invoice → “Pay with Stripe” → Checkout hosted → `checkout.session.completed` webhook marks `PAID` + posts `Dr Cash / Cr AR` base journal (TB balanced), replay idempotent.
- **In Scope**:
  - `prisma/schema.prisma` — `Invoice` `stripeSessionId` unique + `stripePaymentIntentId` + `StripeEvent` (`stripeId unique`, `type`, `payload`, `processedAt`) + `migrate add_stripe`
  - `src/lib/stripe.ts` — `stripe` init (`stripe@19.1.0` from `STRIPE_SECRET_KEY`) + `createCheckoutSession(invoice)` (`unit_amount = baseTotalCents`, `currency usd`, `client_reference_id`)
  - `src/app/api/stripe/webhook/route.ts` — `POST` raw `request.text()` + `stripe.webhooks.constructEvent` + `StripeEvent` dedup + `checkout.session.completed` → idempotent `markPaid` (`p-stripe-<eventId>`) + `200`/`400`
  - `src/actions/stripe.ts` — `createCheckout({invoiceId})` (Zod `cuid`, `requireSession`, `UNPAID` guard, `stripe.checkout.sessions.create` + `db.invoice.update stripeSessionId`)
  - `src/components/StripePayButton.tsx` + `src/app/invoices/[id]/page.tsx` `Pay with Stripe` when `UNPAID`
  - `.env.example` `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` placeholders, `stripe@19.1.0`, `src/lib/stripe.test.ts` (sig + idempotency)
- **Explicit Non-Goals**:
  - Subscriptions/recurring, refunds/chargebacks, Customer Portal, PaymentIntents custom form
  - Live FX in Checkout beyond `baseTotalCents` (Checkout stays `usd`)
  - Revaluation, gain/loss postings, bank CSV multi-currency handling
  - Email/SMS receipt beyond Stripe’s own, `JournalLine` fee changes, keeping `local-only` (M7 requires hosted)
- **Dependencies**: `None` (reuses M5 auth wall + M6 `baseTotalCents` + M1 `markPaid` as-is; additive Stripe columns)
- **Risk**: `High` - external webhook + secrets + hosted ephemeral DB; mitigation: additive columns, `stripeId unique` dedup, `p-stripe-<id>` idempotency, `requireSession` on `createCheckout`, raw body `request.text()`, `.env` gitignored + placeholder hygiene, Stripe `400` on bad sig
- **Verification Condition**: `bun test && bunx tsc --noEmit && bun run lint && bun run build` + Stripe CLI `trigger checkout.session.completed` → `PAID` + `Dr1000/Cr1200==base` + replay `200` no duplicate + TB balanced + `307/200` gate still

## 3. Acceptance Criteria

- [ ] **AC-1**: Checkout Session created for UNPAID invoice with base amount
  - **Result**: `Pending`
  - **Evidence**: `bun test src/lib/stripe.test.ts (createCheckout cases) + build`
  - Gherkin: `Given UNPAID EUR invoice 100×1.08 base 10800, When createCheckout, Then Stripe session with unit_amount 10800 currency usd client_reference_id invoiceId, Invoice.stripeSessionId set, URL returned. Given PAID, When createCheckout, Then 409.`

- [ ] **AC-2**: Webhook verifies signature and marks PAID idempotently
  - **Result**: `Pending`
  - **Evidence**: `bun test (webhook sig/idempotency) + Stripe CLI smoke`
  - Gherkin: `Given stripe event checkout.session.completed with valid sig and client_reference_id, When POST /api/stripe/webhook, Then 200, invoice UNPAID→PAID, journal Dr1000/Cr1200==base, StripeEvent stripeId recorded. Given replay same stripeId, When POST again, Then 200, no second journal, TB balanced.`

- [ ] **AC-3**: Invalid signature / bad payload fails closed
  - **Result**: `Pending`
  - **Evidence**: `bun test (400 cases)`
  - Gherkin: `Given missing/invalid Stripe-Signature, When POST /api/stripe/webhook, Then 400, no DB change. Given missing client_reference_id, Then 400.`

- [ ] **AC-4**: Button shows only when pay-able and triggers Checkout
  - **Result**: `Pending`
  - **Evidence**: `bun run build + dev smoke`
  - Gherkin: `Given UNPAID invoice, When visiting /invoices/[id] authed, Then Pay with Stripe button present. Given PAID/VOID, Then button absent, Stripe badge shows when stripeSessionId. Click Pay → Stripe redirect URL. KB + ARIA pass.`

- [ ] **AC-5**: No regression — auth wall, multi-currency, ledger invariants intact
  - **Result**: `Pending`
  - **Evidence**: `bun test 62+ new + build Proxy + curl gate`
  - Gherkin: `Given Stripe paid EUR invoice, When visiting /trial-balance, Then TB balanced base, revenue == base sum; When unauthed GET /, Then 307 /login; When authed, Then 200. 62+ tests green, no passwordHash/Stripe secret leak.`

## 4. Execution Policy

- **Mode**: `Gated Mode`
- **TDD Enforcement Mode**: `disabled`
- **Batch Authorization**: `N/A`
- **Soft Checkpoint**: `Around 60 minutes`
- **Hard Checkpoint**: `At or before 90 minutes`
- **Event-Driven Checkpoints**: `Milestone, task switch, scope expansion, handoff, compaction, or context drift`
- **Stop Conditions**: `Missing approval/context, failed verification/CI/invariant, blocker, hard checkpoint, or developer stop`
- **Host Timer Capability**: `No mechanical enforcement; manual checkpoint discipline`

## 5. State and Active Ownership

- **Execution State**: `in_progress`
- **Mapped `pk:tasks` Status**: `In Progress`
- **Active Task Pointer**: `TASK-2026-09-17-stripe`
- **Start Time**: `2026-09-17 UTC`
- **Current Actor**: `Assistant (M7.1)`
- **Next Action**: `Build M7.1 Schema + Stripe client — Invoice.stripe* + StripeEvent + stripe@19.1.0`

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
|---|---|---|---|---|---|
| `N/A` | `planned` | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Record created from PLAN-stripe` | `docs/specs/2026-09-17-spec-stripe.md` |
| `planned` | `ready` | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Objective, scope, AC, dependencies, risk, verification complete — awaiting in_progress approval` | `this record §2–§4` |
| `ready` | `in_progress` | `2026-09-17 UTC` | `Assistant (M7.1)` | `User approved in_progress — begin M7.1 Schema + Stripe client` | `user reply "1"` |

### Atomic Breakdown (1–4h each, dependency order)

- [ ] **M7.1 Schema + Stripe client (p0, area:data/backend)** — `prisma/schema.prisma` `Invoice.stripe*` + `StripeEvent` + `migrate add_stripe`, `src/lib/stripe.ts` `stripe` init + `createCheckoutSession`, `stripe@19.1.0` + `.env.example` placeholders. Accepts AC-1.
- [ ] **M7.2 Checkout action + webhook (p0, area:backend)** — `src/actions/stripe.ts` `createCheckout`, `src/app/api/stripe/webhook/route.ts` raw-body + `constructEvent` + dedup + `checkout.session.completed` → `markPaid` base, `runtime nodejs`. Accepts AC-2/AC-3.
- [ ] **M7.3 Button + wiring (p1, area:frontend)** — `src/components/StripePayButton.tsx` + `src/app/invoices/[id]/page.tsx` `Pay with Stripe` when `UNPAID`, badge when `stripeSessionId`. Accepts AC-4.
- [ ] **M7.4 Hardening + verify (p2, area:auth)** — `tsc`/`lint`/`build` green, `grep -n STRIPE_` + `StripeEvent` audit, Stripe CLI `trigger checkout.session.completed` → `PAID` + `Dr1000/Cr1200==base` + replay `200` no duplicate + TB balanced + hosted, `.env` hygiene, `requireSession` still. Accepts AC-1..AC-5.

Invariants locked: INV-01 balanced fail-closed, INV-02 integer cents (base `unit_amount`), INV-03 append-only+reversals (webhook is `markPaid`), M5 auth wall intact. Out of scope: subs, refunds, portal, live FX, local-only.

## 6. Evidence and Completion Gate

- **Changed Files**:
  - `prisma/schema.prisma` - Invoice stripeSessionId/stripePaymentIntentId + StripeEvent
  - `prisma/migrations/*_add_stripe/migration.sql` - additive StripeEvent + invoice columns
  - `src/lib/stripe.ts` - stripe init + createCheckoutSession
  - `src/app/api/stripe/webhook/route.ts` - POST raw + constructEvent + dedup + markPaid
  - `src/actions/stripe.ts` - createCheckout Server Action
  - `src/components/StripePayButton.tsx` - Pay with Stripe button
  - `src/app/invoices/[id]/page.tsx` - wiring Pay with Stripe when UNPAID
  - `src/lib/stripe.test.ts` - sig + idempotency tests
  - `.env.example` - STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET placeholders
- **Verification Evidence**: `Pending — M7.1..M7.4`
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Behavior IDs [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification [Required for Documentation, Configuration, or Research Work; Not applicable for Code Work]**: `N/A - Code Work`
- **CI Evidence**: `N/A`
- **Review Evidence**: `N/A`
- **Commit Evidence**: `N/A before commit`
- **Pull Request Evidence**: `N/A (no remote)`
- **Release Evidence**: `N/A`
- **Blocker and Resume Condition**: `None — ready, awaiting explicit approval to enter in_progress`

- **Completion State**: `ready`
- **Acceptance Results**: `Pending — AC-1..AC-5`
- **Changed-File Summary**: `Pending`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `N/A - planned`

