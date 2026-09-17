# Task Record: Milestone 6 — Multi-Currency Foreign Invoices (Base USD)

<a id="TASK-2026-09-17-multi-currency"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-17-multi-currency`
- **PromptKit Adaptation Profile**: `none` (legacy dated ID preserved)
- **Work Type**: `Code Work`
- **Planning Record Link**: `[PLAN-multi-currency](../specs/2026-09-17-spec-multi-currency.md#PLAN-multi-currency)`
- **Planning Depth Reference**: `Full`
- **Assumption Record Links**: `[ASSUMPTION-multi-currency-001, ASSUMPTION-multi-currency-002, ASSUMPTION-multi-currency-003](../specs/2026-09-17-spec-multi-currency.md#PLAN-multi-currency)` (all accepted, owner: user)
- **Specification**: `docs/specs/2026-09-17-spec-multi-currency.md`
- **External Reference (Optional)**: `N/A`
- **Owner / Actor**: `user (solo freelancer, M6 approver)`
- **Execution Scope**: `Repository standalone (single Next.js app + local SQLite)`
- **Approval Boundary**: `Commits need explicit approval; no push without remote + approval; scope expansion needs Scope Change Record`
- **Created**: `2026-09-17 UTC`

> This Local Task Source is authoritative for Controlled Work. Planning/Assumption links are context only.

## 2. Objective and Boundaries

- **Objective**: Invoice foreign clients (EUR/GBP) with manual FX rate — foreign amounts on the invoice, base USD in the ledger (TB balanced), receipt shows `EUR → USD`.
- **In Scope**:
  - `prisma/schema.prisma` — `Currency` enum + `Invoice` `currency` + `fxRateBps` + `baseSubtotalCents` + `baseTotalCents` + `prisma/migrations/*_add_currency` + backfill `USD/10000/base=foreign`
  - `src/lib/money.ts` — `CurrencySchema`, `convertCents(foreign, fxRateBps)` integer helper + `CURRENCY_CODES`
  - `src/lib/invoicing.ts` — FX-aware `postInvoice` (foreign→base, journal Dr1200/Cr4000 = `baseTotalCents`) + `PostInvoiceSchema` `currency`+`fxRateBps`
  - `src/actions/invoicing.ts` — `currency`/`fxRate` string parsing (`1.08`→10800), USD guard, `getInvoiceReceipt` dual display
  - `src/components/InvoiceForm.tsx` — currency select + FX rate input + live base preview
  - `src/components/InvoiceList.tsx` / `InvoiceReceipt.tsx` — dual display `EUR 100.00 → USD 108.00` when `currency≠USD`
  - `src/lib/invoicing.test.ts` + `src/lib/money.test.ts` — FX unit tests
- **Explicit Non-Goals**:
  - Live FX API fetch, cached `FxRate` table, provider keys
  - Revaluation, unrealized FX gain/loss journals, post-payment FX adjustments
  - Multi-currency bank CSV imports, Stripe presentment
  - Base-currency per-org configurability (M6 base fixed `USD`)
  - JPY 0-decimal exact handling beyond 2-decimal simplification
  - Any change to `JournalLine` schema (lines stay base-only) or auth wall
- **Dependencies**: `None` (reuses M5 auth + M1–M4 engines as-is; additive columns with defaults)
- **Risk**: `Medium` - new schema + money math; mitigation: additive columns with defaults + backfill, `convertCents` integer only, `requireSession` still on all actions, `balance==base` assert, Zod `currency` enum + `fxRateBps 1000..50000`
- **Verification Condition**: `bun test && bunx tsc --noEmit && bun run lint && bun run build` + dev smoke (USD 100→100, EUR 100×1.08→108, TB balanced, receipt dual)

## 3. Acceptance Criteria

- [ ] **AC-1**: Currency + FX rate stored and converted via integer math
  - **Result**: `Pending`
  - **Evidence**: `bun test src/lib/money.test.ts (convertCents cases)`
  - Gherkin: `Given foreignCents 10000 and fxRateBps 10800, When convertCents, Then 10800. Given 1c×1.005 (10050 bps) with 1c, Then rounds to 1c. Given USD, When fxRateBps≠10000, Then Zod rejects.`

- [ ] **AC-2**: Foreign invoice posts balanced journal in base
  - **Result**: `Pending`
  - **Evidence**: `bun test src/lib/invoicing.test.ts (FX post cases) + TB balanced`
  - Gherkin: `Given EUR invoice 100.00 + fxRate 1.08, When postInvoice, Then foreign total 10000, baseTotal 10800, journal Dr1200 10800 / Cr4000 10800, TB debits==credits==base. USD 100.00 → base 10000.`

- [ ] **AC-3**: Invalid FX fails closed, nothing posts
  - **Result**: `Pending`
  - **Evidence**: `bun test (error cases)`
  - Gherkin: `Given fxRateBps 0 or 99 or currency=USD with 10800, When postInvoice, Then ValidationError, zero invoices and zero journals created; duplicate number still 409.`

- [ ] **AC-4**: UI captures currency + rate and shows base preview
  - **Result**: `Pending`
  - **Evidence**: `bun run build + dev smoke`
  - Gherkin: `Given InvoiceForm, When select EUR and type 1.08, Then live preview shows USD 108.00. On submit, Then invoice persists with currency EUR, fxRateBps 10800. KB + ARIA pass.`

- [ ] **AC-5**: Receipt + list show dual totals when foreign, TB/P&L stay base-only
  - **Result**: `Pending`
  - **Evidence**: `bun run build + dev smoke receipt`
  - Gherkin: `Given EUR invoice 100×1.08, When visiting /invoices and /invoices/[id], Then shows EUR 100.00 → USD 108.00; When visiting /trial-balance + /profit-loss, Then revenue == base sum, TB balanced.`

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
- **Active Task Pointer**: `TASK-2026-09-17-multi-currency`
- **Start Time**: `2026-09-17 UTC`
- **Current Actor**: `Assistant (M6.1)`
- **Next Action**: `Build M6.1 Schema + money — Currency + convertCents + Invoice columns`

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
|---|---|---|---|---|---|
| `N/A` | `planned` | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Record created from PLAN-multi-currency` | `docs/specs/2026-09-17-spec-multi-currency.md` |
| `planned` | `ready` | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Objective, scope, AC, dependencies, risk, verification complete — awaiting in_progress approval` | `this record §2–§4` |
| `ready` | `in_progress` | `2026-09-17 UTC` | `Assistant (M6.1)` | `User approved in_progress — begin M6.1 Schema + money` | `user reply "1"` |

### Atomic Breakdown (1–4h each, dependency order)

- [ ] **M6.1 Schema + money (p0, area:data/backend)** — `prisma/schema.prisma` `Currency` + `Invoice` columns + `migrate add_currency` + backfill, `src/lib/money.ts` `convertCents` + `CurrencySchema` + unit tests. Accepts AC-1.
- [ ] **M6.2 Engine + tests (p0, area:backend)** — `src/lib/invoicing.ts` FX-aware `postInvoice` (foreign→base, journal in base) + `src/lib/invoicing.test.ts` (USD+EUR, journal base, idempotency, void). Accepts AC-2/AC-3.
- [ ] **M6.3 UI + receipt (p1, area:frontend)** — `src/actions/invoicing.ts` `currency`/`fxRate` parsing, `InvoiceForm.tsx` select+rate+preview, `InvoiceList.tsx`/`InvoiceReceipt.tsx` dual, `getInvoiceReceipt` dual. Accepts AC-4/AC-5.
- [ ] **M6.4 Hardening + verify (p2, area:auth)** — `tsc`/`lint`/`build` green, `grep -n fxRateBps` + `convertCents` no float, smoke `USD 100→100` + `EUR 100×1.08→108` + TB balanced, `requireSession` still on all actions. Accepts AC-1..AC-5.

Invariants locked: INV-01 balanced fail-closed, INV-02 integer cents + `convertCents` integer, INV-03 append-only+reversals. INV-04 auth wall intact (M5). Out of scope: live FX, revaluation, CSV multi-currency, Stripe, JPY exact, base-config.

## 6. Evidence and Completion Gate

- **Changed Files**:
  - `prisma/schema.prisma` - Currency + Invoice currency/fxRateBps/baseSubtotalCents/baseTotalCents
  - `prisma/migrations/*_add_currency/migration.sql` - additive columns + backfill
  - `src/lib/money.ts` - CurrencySchema, convertCents, CURRENCY_CODES
  - `src/lib/invoicing.ts` - FX-aware postInvoice (foreign→base)
  - `src/lib/invoicing.test.ts` - FX unit tests (USD+EUR)
  - `src/lib/money.test.ts` - convertCents rounding cases
  - `src/actions/invoicing.ts` - currency/fxRate parsing + dual display helpers
  - `src/components/InvoiceForm.tsx` - currency select + rate + preview
  - `src/components/InvoiceList.tsx` - dual EUR → USD display
  - `src/components/InvoiceReceipt.tsx` - dual totals
- **Verification Evidence**: `Pending — M6.1..M6.4`
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

