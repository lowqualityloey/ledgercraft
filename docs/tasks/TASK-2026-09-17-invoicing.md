# Task Record: Milestone 2 — Clients + Invoicing (accrual, full-pay)

<a id="TASK-2026-09-17-invoicing"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-17-invoicing`
- **PromptKit Adaptation Profile**: `none`
- **Work Type**: `Code Work`
- **Planning Record Link**: `[PLAN-invoicing](../specs/2026-09-17-spec-invoicing.md#PLAN-invoicing)`
- **Planning Depth Reference**: `Full`
- **Assumption Record Links**: `[ASSUMPTION-invoicing-001](../specs/2026-09-17-spec-invoicing.md#PLAN-invoicing)` (revenue at issue; open, owner: user)
- **Specification**: `docs/specs/2026-09-17-spec-invoicing.md`
- **External Reference (Optional)**: `N/A`
- **Owner / Actor**: `user (solo maintainer)`
- **Execution Scope**: `Repository standalone (single Next.js app + local SQLite)`
- **Approval Boundary**: `Commits need explicit approval; no push without remote + approval; scope expansion needs Scope Change Record`
- **Created**: `2026-09-17 UTC`

> This Local Task Source is authoritative for Controlled Work. Planning/Assumption links are context only. The adaptation profile is `none` because this record keeps its legacy dated ID.

## 2. Objective and Boundaries

- **Objective**: Freelancer creates Clients + Invoices; invoice post auto-creates balanced journal (Dr 1200 AR / Cr 4000); payment clears AR→Cash; void reverses append-only. TB stays balanced.
- **In Scope**:
  - `prisma/schema.prisma` — `Client`, `Invoice`, `InvoiceLine` (+ back-relations on `JournalEntry`)
  - `src/lib/invoicing.ts` — `createClient`, `postInvoice`, `markPaid`, `voidInvoice` (Zod boundaries, integer cents)
  - `src/app/clients/**`, `src/app/invoices/**` + Server Actions
  - Tests `tests/invoicing.test.ts` (≥10), TB/P&L reuse (no M1 engine changes)
- **Explicit Non-Goals**:
  - PDF, bank CSV, auth/multi-user, multi-currency, Stripe, partial payments, dunning, editing posted entries
- **Dependencies**: `None` (M1 engine `postJournal`/`reverseEntry` reuse as-is)
- **Risk**: `Medium` - new schema + money movement; mitigation: fail-closed balance checks, idempotency keys, Restrict FKs, accrual assumption flagged open
- **Verification Condition**: `bun test && bunx tsc --noEmit && bun run lint && bun run build` + dev smoke (client→invoice→paid→TB balanced)

## 3. Acceptance Criteria

- [ ] **AC-1**: Client CRUD persists with unique email
  - **Result**: `Pending`
  - **Evidence**: `bun test tests/invoicing.test.ts (client cases)`
  - Gherkin: `Given a name+email, When createClient, Then row persists; And duplicate email → 409/unique error.`
- [ ] **AC-2**: Invoice post creates balanced journal + UNPAID status
  - **Result**: `Pending`
  - **Evidence**: `bun test (post cases) + TB balanced`
  - Gherkin: `Given client + lines (qty×unitCents), When postInvoice, Then total=Σ, status=UNPAID, journal Dr1200/Cr4000 == total; unbalanced → fail closed, stays DRAFT.`
- [ ] **AC-3**: Mark paid clears AR→Cash, double-pay rejected
  - **Result**: `Pending`
  - **Evidence**: `bun test (pay/idempotency cases)`
  - Gherkin: `Given UNPAID invoice, When markPaid, Then Dr1000/Cr1200 == total, status=PAID; When markPaid again, Then ConflictError, no new entry; retry same idempotencyKey returns original.`
- [ ] **AC-4**: Void reverses append-only, never deletes
  - **Result**: `Pending`
  - **Evidence**: `bun test (void cases)`
  - Gherkin: `Given UNPAID|PAID invoice, When voidInvoice, Then reversal entries appended, status=VOID, originals intact; double-void rejected.`
- [ ] **AC-5**: UI + reports: /clients, /invoices usable, TB/P&L correct
  - **Result**: `Pending`
  - **Evidence**: `bun run build + dev smoke 200s`
  - Gherkin: `Given posted+paid invoice, When visiting /trial-balance + /profit-loss, Then AR cleared, Cash up, revenue == invoice total; keyboard + ARIA pass.`

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
- **Current Actor**: `Assistant (M2 shipped)`
- **Next Action**: `None — M2 complete; Later ledger remains: PDF, CSV, auth, multi-currency, Stripe`
- **Branch / Revision**: `main @ 1e3361f` (scope `b2f9e1f` + product `1e3361f`; the record's commit-evidence line was later extended by M3's plan commit `bcf62fa`, which is not part of this task's work)

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
|---|---|---|---|---|---|
| N/A | planned | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Record created from PLAN-invoicing` | `docs/specs/2026-09-17-spec-invoicing.md` |
| planned | ready | 2026-09-17 UTC | Assistant (pk:tasks) | Objective, In Scope, AC, dependencies, risk and verification condition recorded | this record sections 2 to 4 |
| ready | in_progress | 2026-09-17 UTC | Assistant | Implementation started — M2.1 client and invoice schema | this record; PLAN-invoicing |
| in_progress | awaiting_review | 2026-09-17 UTC | Assistant | M2.1 to M2.4 complete; 30 pass / 0 fail; user acceptance outstanding | bun test 30 pass / 0 fail; build 8 of 8 routes, smoke 5 of 5 |
| awaiting_review | completed | 2026-09-17 UTC | Assistant (M2 shipped) | User acceptance received; commits b2f9e1f + 1e3361f | user acceptance; AC-1 to AC-5 at Pass |

### Atomic Breakdown (1–4h each, dependency order)

- [x] **T1: Schema + seed refs (p0, area:data)** — done 2026-09-17: migration `add-clients-invoicing`, `prisma generate`, `tsc` clean, 17/17 green.
- [x] **T2: Engine + unit tests (p0, area:backend)** — done 2026-09-17: `src/lib/invoicing.ts` + 13 tests green (30/30 total).
- [x] **T3: Actions + UI (p1, area:frontend)** — done 2026-09-17: `/clients` + `/invoices` + Actions, mono tables, status badges; `tsc`+`lint`+`build` green, smoke 5/5 200.
- [x] **T4: Reports wiring + hardening + verify (p2)** — done 2026-09-17: grep clean (fixed 1 float display), full gate green; manual acceptance pending user.

Invariants locked: INV-01 balanced fail-closed, INV-02 integer cents, INV-03 append-only+reversals, INV-04 local single-owner. Out of scope: PDF/CSV/auth/multi-currency/Stripe/partials.

## 6. Evidence and Completion Gate

- **Changed Files**:
  - `prisma/schema.prisma` - Client/Invoice/InvoiceLine + JournalEntry back-relations
  - `prisma/migrations/20260917065632_add_clients_invoicing/migration.sql` - additive migration
  - `src/lib/invoicing.ts` - createClient/postInvoice/markPaid/voidInvoice (code-resolved 1000/1200/4000, short-key idempotency)
  - `src/lib/invoicing.test.ts` - 13 tests (AC-1..AC-4 + accrual)
  - `src/actions/invoicing.ts` - list/create clients+invoices, pay/void (dollar parse at boundary, UUID idempotency)
  - `src/components/ClientForm.tsx`, `InvoiceForm.tsx`, `InvoiceList.tsx` - forms + status badges + pay/void
  - `src/app/clients/page.tsx`, `src/app/invoices/page.tsx`, `src/app/page.tsx` - pages + nav
- **Verification Evidence**: `T1: prisma validate OK; migrate OK; generate OK; tsc clean; bun test 17/0. T2 2026-09-17: bun test 30/30 (13 new); tsc clean; eslint clean. T3: build 8/8 routes; dev smoke 5/5 200. T4 2026-09-17: grep clean (fixed float /100 display → formatCents in InvoiceList); full gate 30/30 + tsc + lint + build green`
- **Scope Change Records**: `SCOPE-2026-09-17-invoicing-01` (retroactive — created 2026-09-23 for the boundary findings recorded there)
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Behavior IDs [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification [Required for Documentation, Configuration, or Research Work; Not applicable for Code Work]**: `N/A - Code Work`
- **CI Evidence**: `None — this repository has no test workflow, so there is no CI result to link; the gate was run locally and is recorded under Verification Evidence.`
- **Review Evidence**: `None — no review artifact was produced; acceptance was the owner's in-session review of the milestone, recorded under Acceptance Results.`
- **Commit Evidence**: `b2f9e1f docs(plan): scope milestone 2 clients invoicing (spec + task + STATE); 1e3361f feat(invoicing): add clients and accrual invoicing with auto-posting (T1–T4)`
- **Pull Request Evidence**: `N/A (no remote)`
- **Release Evidence**: `N/A`
- **Blocker and Resume Condition**: `None — accepted 2026-09-17 (user reply "accepted + dr/cr totals"; numeric totals not reported, balance proven by 30/30 tests + TB assertions)`

- **Completion State**: `completed`
- **Acceptance Results**: `AC-1 pass (tests); AC-2 pass (tests + TB balanced); AC-3 pass (tests); AC-4 pass (tests); AC-5 pass (build 8/8, smoke 5/5, user accepted 2026-09-17)`
- **Changed-File Summary**: `prisma schema+migration; src/lib/invoicing.ts + tests; src/actions/invoicing.ts; ClientForm/InvoiceForm/InvoiceList; /clients + /invoices pages; home nav`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `Completed 2026-09-17 UTC; user acceptance of M2; commits b2f9e1f + 1e3361f`
