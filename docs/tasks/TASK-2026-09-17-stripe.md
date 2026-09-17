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

- [x] **AC-1**: Checkout Session created for UNPAID invoice with base amount
  - **Result**: `Pass`
  - **Evidence**: `d1a1a92 build POST /api/stripe/webhook + Pay with Stripe works on UNPAID EUR→USD 10800`
  - Gherkin: `Given UNPAID EUR invoice 100×1.08 base 10800, When createCheckout, Then Stripe session with unit_amount 10800 currency usd client_reference_id invoiceId, Invoice.stripeSessionId set, URL returned. Given PAID, When createCheckout, Then 409.`

- [x] **AC-2**: Webhook verifies signature and marks PAID idempotently
  - **Result**: `Pass`
  - **Evidence**: `simulated checkout.session.completed → PAID Dr1000/Cr1200==base TB 120800, replay 200 no duplicate`
  - Gherkin: `Given stripe event checkout.session.completed with valid sig and client_reference_id, When POST /api/stripe/webhook, Then 200, invoice UNPAID→PAID, journal Dr1000/Cr1200==base, StripeEvent stripeId recorded. Given replay same stripeId, When POST again, Then 200, no second journal, TB balanced.`

- [x] **AC-3**: Invalid signature / bad payload fails closed
  - **Result**: `Pass`
  - **Evidence**: `src/app/api/stripe/webhook 400 on missing/invalid sig, friendly Stripe not configured error`
  - Gherkin: `Given missing/invalid Stripe-Signature, When POST /api/stripe/webhook, Then 400, no DB change. Given missing client_reference_id, Then 400.`

- [x] **AC-4**: Button shows only when pay-able and triggers Checkout
  - **Result**: `Pass`
  - **Evidence**: `curl UNPAID shows Pay with Stripe, PAID hides, Stripe badge when stripeSessionId, 62/62`
  - Gherkin: `Given UNPAID invoice, When visiting /invoices/[id] authed, Then Pay with Stripe button present. Given PAID/VOID, Then button absent, Stripe badge shows when stripeSessionId. Click Pay → Stripe redirect URL. KB + ARIA pass.`

- [x] **AC-5**: No regression — auth wall, multi-currency, ledger invariants intact
  - **Result**: `Pass`
  - **Evidence**: `62/62 + tsc + build Proxy 307/200 + Stripe friendly error when not configured`
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

- **Execution State**: `completed`
- **Mapped `pk:tasks` Status**: `Done`
- **Active Task Pointer**: `None`
- **Start Time**: `2026-09-17 UTC`
- **Current Actor**: `Assistant (M7 shipped)`
- **Next Action**: `None — M7 complete; all Later ledger shipped`

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
|---|---|---|---|---|---|
| `N/A` | `planned` | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Record created from PLAN-stripe` | `docs/specs/2026-09-17-spec-stripe.md` |
| `planned` | `ready` | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Objective, scope, AC, dependencies, risk, verification complete — awaiting in_progress approval` | `this record §2–§4` |
| `ready` | `in_progress` | `2026-09-17 UTC` | `Assistant (M7.1)` | `User approved in_progress — begin M7.1 Schema + Stripe client` | `user reply "1"` |
| `in_progress` | `completed` | `2026-09-17 UTC` | `Assistant (M7 shipped)` | `M7.1–M7.4 + Pay with Stripe works — 62/62` | `user reply "it works"` |

### Atomic Breakdown (1–4h each, dependency order)

- [x] **M7.1 Schema + Stripe client (p0, area:data/backend)** — done 2026-09-17: `Invoice.stripe*` + `StripeEvent` + `migrate add_stripe` (db push), `stripe@19.1.0` + `lib/stripe` friendly not-configured, `.env.example` placeholders, `d1a1a92`.
- [x] **M7.2 Checkout action + webhook (p0, area:backend)** — done 2026-09-17: `createCheckout` + `POST /api/stripe/webhook` raw `constructEvent` + dedup `p-stripe-<evt>` + `markPaid` base, `runtime nodejs`.
- [x] **M7.3 Button + wiring (p1, area:frontend)** — done 2026-09-17: `StripePayButton` `Pay with Stripe` when `UNPAID` + `InvoiceList` Stripe badge, `page.tsx` base display.
- [x] **M7.4 Hardening + verify (p2, area:auth)** — done 2026-09-17: `tsc`/`lint`/`build` Proxy green, `Pay with Stripe` works (user: it works), webhook `PAID` + replay `200`, `62/62` + gate `307/200`.

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
- **Verification Evidence**: `2026-09-17: bun test 62/62 + tsc clean + lint clean + build 11 routes Proxy + POST /api/stripe/webhook + Pay with Stripe works (user it works) + webhook PAID + replay 200 + friendly not-configured`
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Behavior IDs [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification [Required for Documentation, Configuration, or Research Work; Not applicable for Code Work]**: `N/A - Code Work`
- **CI Evidence**: `N/A`
- **Review Evidence**: `N/A`
- **Commit Evidence**: `d1a1a92 feat(stripe): M7.1-M7.3 Checkout + webhook`
- **Pull Request Evidence**: `N/A (no remote)`
- **Release Evidence**: `N/A`
- **Blocker and Resume Condition**: `None — accepted 2026-09-17 (it works)`

- **Completion State**: `completed`
- **Acceptance Results**: `AC-1 Pass, AC-2 Pass, AC-3 Pass, AC-4 Pass, AC-5 Pass (5/5)`
- **Changed-File Summary**: `prisma schema+migration + lib/stripe+actions/stripe+webhook+StripePayButton+InvoiceList badge (d1a1a92)`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `Completed 2026-09-17 UTC — user accepted (it works)`

