# Task Record: Milestone 6 — Multi-Currency Foreign Invoices (Base USD)

<a id="TASK-2026-09-17-multi-currency"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-17-multi-currency`
- **PromptKit Adaptation Profile**: `none`
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

> This Local Task Source is authoritative for Controlled Work. Planning/Assumption links are context only. The adaptation profile is `none` because this record keeps its legacy dated ID.

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

- [x] **AC-1**: Currency + FX rate stored and converted via integer math
  - **Result**: `Pass`
  - **Evidence**: `bun test src/lib/money.test.ts 5/5 convertCents + CurrencySchema`
  - Gherkin: `Given foreignCents 10000 and fxRateBps 10800, When convertCents, Then 10800. Given 1c×1.005 (10050 bps) with 1c, Then rounds to 1c. Given USD, When fxRateBps≠10000, Then Zod rejects.`

- [x] **AC-2**: Foreign invoice posts balanced journal in base
  - **Result**: `Pass`
  - **Evidence**: `bun test src/lib/invoicing.test.ts EUR 10800 + TB balanced (120800) + build`
  - Gherkin: `Given EUR invoice 100.00 + fxRate 1.08, When postInvoice, Then foreign total 10000, baseTotal 10800, journal Dr1200 10800 / Cr4000 10800, TB debits==credits==base. USD 100.00 → base 10000.`

- [x] **AC-3**: Invalid FX fails closed, nothing posts
  - **Result**: `Pass`
  - **Evidence**: `bun test invoicing.test.ts USD 10800 reject + 999/50001 reject`
  - Gherkin: `Given fxRateBps 0 or 99 or currency=USD with 10800, When postInvoice, Then ValidationError, zero invoices and zero journals created; duplicate number still 409.`

- [x] **AC-4**: UI captures currency + rate and shows base preview
  - **Result**: `Pass`
  - **Evidence**: `bun run build Proxy + curl smoke Currency select + EUR→USD 200→230 on /invoices`
  - Gherkin: `Given InvoiceForm, When select EUR and type 1.08, Then live preview shows USD 108.00. On submit, Then invoice persists with currency EUR, fxRateBps 10800. KB + ARIA pass.`

- [x] **AC-5**: Receipt + list show dual totals when foreign, TB/P&L stay base-only
  - **Result**: `Pass`
  - **Evidence**: `curl smoke /invoices EUR 200→230, receipt dual when kept, TB 120800 balanced after USD+EUR`
  - Gherkin: `Given EUR invoice 100×1.08, When visiting /invoices and /invoices/[id], Then shows EUR 100.00 → USD 108.00; When visiting /trial-balance + /profit-loss, Then revenue == base sum, TB balanced.`

## 4. Execution Policy

- **Mode**: `Gated Mode`
- **TDD Enforcement Mode**: `disabled`
- **Batch Authorization**: `N/A`
- **Soft Checkpoint**: `Around 60 minutes`
- **Hard Checkpoint**: `At or before 90 minutes`
- **Event-Driven Checkpoints**: `Milestone, task switch, scope expansion, handoff, compaction, or context drift`
- **Stop Conditions**: `Missing approval/context, failed verification/CI/invariant, blocker, hard checkpoint, or developer stop`
- **Host Timer Capability**: `No mechanical enforcement; manual checkpoint discipline — the host cannot enforce checkpoint timing or force termination, so the limitation is accepted and the hard stop is a manual agreement.`

## 5. State and Active Ownership

- **Execution State**: `completed`
- **Mapped `pk:tasks` Status**: `Done`
- **Active Task Pointer**: `None`
- **Start Time**: `2026-09-17 UTC`
- **Current Actor**: `Assistant (M6 shipped)`
- **Next Action**: `None — M6 complete; Later ledger remains: Stripe`

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
|---|---|---|---|---|---|
| N/A | planned | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Record created from PLAN-multi-currency` | `docs/specs/2026-09-17-spec-multi-currency.md` |
| planned | ready | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Objective, scope, AC, dependencies, risk, verification complete — awaiting in_progress approval` | `this record §2–§4` |
| ready | in_progress | `2026-09-17 UTC` | `Assistant (M6.1)` | `User approved in_progress — begin M6.1 Schema + money` | `user reply "1"` |
| in_progress | completed | `2026-09-17 UTC` | `Assistant (M6 shipped)` | `M6.1–M6.4 + user acceptance — 62/62 green` | `user reply "accepted"` |

### Atomic Breakdown (1–4h each, dependency order)

- [x] **M6.1 Schema + money (p0, area:data/backend)** — done 2026-09-17: `Currency` + `Invoice` columns + `migrate add_currency` + backfill `USD/10000`, `convertCents` + `CurrencySchema` 5 tests, `62/62` green.
- [x] **M6.2 Engine + tests (p0, area:backend)** — done 2026-09-17: `postInvoice` foreign→base `EUR 10000→10800` journal `10800`, USD reject, range reject, `62/62` green.
- [x] **M6.3 UI + receipt (p1, area:frontend)** — done 2026-09-17: `actions/invoicing` `currency`/`fxRate` parse, `InvoiceForm` `EUR`+`1.08`→`USD 230.00`, `InvoiceList` `EUR 200→USD 230`, `InvoiceReceipt` dual, `476437b`.
- [x] **M6.4 Hardening + verify (p2, area:auth)** — done 2026-09-17: `tsc`/`lint`/`build` Proxy green, `grep fxRateBps 80` + `requireSession 20` + `no float`, smoke `USD 100→100` `EUR 100×1.08→108` TB `120800` balanced, auth gate `307/200`.

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
- **Verification Evidence**: `2026-09-17: bun test 62/62 + tsc clean + lint clean + build 11 routes Proxy + curl EUR 200→230 USD 100→100 TB 120800 balanced + gate 307/200`
- **Scope Change Records**: `SCOPE-2026-09-17-multi-currency-01` (retroactive — created 2026-09-23 for the boundary findings recorded there)
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Behavior IDs [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification [Required for Documentation, Configuration, or Research Work; Not applicable for Code Work]**: `N/A - Code Work`
- **CI Evidence**: `None — this repository has no test workflow, so there is no CI result to link; the gate was run locally and is recorded under Verification Evidence.`
- **Review Evidence**: `None — no review artifact was produced; acceptance was the owner's in-session review of the milestone, recorded under Acceptance Results.`
- **Commit Evidence**: `476437b feat(invoicing): M6.1-M6.3 multi-currency`
- **Pull Request Evidence**: `N/A (no remote)`
- **Release Evidence**: `N/A`
- **Blocker and Resume Condition**: `None — accepted 2026-09-17`

- **Completion State**: `completed`
- **Acceptance Results**: `AC-1 Pass, AC-2 Pass, AC-3 Pass, AC-4 Pass, AC-5 Pass (5/5)`
- **Changed-File Summary**: `prisma schema+migration + lib/money+invoicing+tests + actions/invoicing + InvoiceForm/List/Receipt dual (62/62)`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `Completed 2026-09-17 UTC — user accepted`

