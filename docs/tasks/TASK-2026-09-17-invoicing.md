# Task Record: Milestone 2 — Clients + Invoicing (accrual, full-pay)

<a id="TASK-2026-09-17-invoicing"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-17-invoicing`
- **PromptKit Adaptation Profile**: `none` (legacy dated ID preserved)
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

> This Local Task Source is authoritative for Controlled Work. Planning/Assumption links are context only.

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
- **Host Timer Capability**: `No mechanical enforcement; manual checkpoint discipline`

## 5. State and Active Ownership

- **Execution State**: `planned`
- **Mapped `pk:tasks` Status**: `To Do`
- **Active Task Pointer**: `None`
- **Start Time**: `N/A`
- **Current Actor**: `Assistant (planning)`
- **Next Action**: `Approve Task Record → start T1 schema`

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
|---|---|---|---|---|---|
| `N/A` | `planned` | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Record created from PLAN-invoicing` | `docs/specs/2026-09-17-spec-invoicing.md` |

### Atomic Breakdown (1–4h each, dependency order)

- [ ] **T1: Schema + seed refs (p0, area:data)** — migration `Client/Invoice/InvoiceLine`, resolve 1000/1200/4000 by code; verify `bunx prisma generate && bunx tsc --noEmit`.
- [ ] **T2: Engine + unit tests (p0, area:backend)** — `src/lib/invoicing.ts` + `tests/invoicing.test.ts` (AC-1..AC-4, ≥10 tests); verify `bun test`.
- [ ] **T3: Actions + UI (p1, area:frontend)** — `/clients`, `/invoices` + Actions, mono tables, status badges, WCAG AA; verify `bun run lint && bun run build`.
- [ ] **T4: Reports wiring + hardening + verify (p2)** — TB/P&L smoke, dev 5/5, full gate `bun test && tsc && lint && build`; verify AC-5.

Invariants locked: INV-01 balanced fail-closed, INV-02 integer cents, INV-03 append-only+reversals, INV-04 local single-owner. Out of scope: PDF/CSV/auth/multi-currency/Stripe/partials.

## 6. Evidence and Completion Gate

- **Changed Files**: `None yet`
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: `N/A - planned`
- **Behavior IDs [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification [Required for Documentation, Configuration, or Research Work; Not applicable for Code Work]**: `N/A - Code Work`
- **CI Evidence**: `N/A`
- **Review Evidence**: `N/A`
- **Commit Evidence**: `N/A before commit`
- **Pull Request Evidence**: `N/A (no remote)`
- **Release Evidence**: `N/A`
- **Blocker and Resume Condition**: `None`

- **Completion State**: `planned`
- **Acceptance Results**: `AC-1..AC-5 pending`
- **Changed-File Summary**: `None yet`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `N/A - planned`
