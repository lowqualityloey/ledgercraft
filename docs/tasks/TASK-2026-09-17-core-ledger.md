# Task Record: LedgerCraft Milestone 1 — Core Ledger Engine

<a id="TASK-2026-09-17-core-ledger"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-17-core-ledger`
- **PromptKit Adaptation Profile**: `none`
- **Work Type**: `Code Work`
- **Planning Record Link**: `[PLAN-core-ledger](../specs/2026-09-17-spec-core-ledger.md#PLAN-core-ledger)`
- **Planning Depth Reference**: `Full`
- **Assumption Record Links**: Intake `ASSUMPTION-01/02/03` in `../specs/2026-09-17-intake-ledgercraft.md`
- **Specification**: `docs/specs/2026-09-17-spec-core-ledger.md`
- **External Reference (Optional)**: `N/A`
- **Owner / Actor**: `User`
- **Execution Scope**: `Repository standalone (single Next.js app + local SQLite)`
- **Approval Boundary**: `Human confirm before scaffold, before first migration/seed, and before commit/PR`
- **Created**: `2026-09-17 UTC`

> This Local Task Source is authoritative for Controlled Work. Planning Record and Assumption Record links provide context only; they do not control readiness, execution state, active ownership, completion, or approval.

## 2. Objective and Boundaries

- **Objective**: Deliver local double-entry core: seeded 5-class CoA, atomic balanced journal with cents-only math + reversals, Trial Balance + P&L that provably balance.
- **In Scope**:
  - `prisma/schema.prisma` (Account, JournalEntry, JournalLine, AccountType) + initial migration + CoA seed
  - `lib/money.ts` (`parseDollarsToCents`, formatting), `lib/ledger.ts` (`postJournal`, `reverseEntry`), Zod schemas
  - Server Actions (`createJournalAction`, `reverseJournalAction`, `getTrialBalance`, `getProfitAndLoss`)
  - UI: CoA list, Journal Form (live balance), TB + P&L tables (Tailwind, monospace, a11y)
  - Tests: balance validator, cents math, reversal linkage, TB sums
- **Explicit Non-Goals**:
  - Invoicing, clients, PDF, CSV imports, auth/multi-user, multi-currency, Stripe, hosting, E2E harness
- **Dependencies**: `None` (greenfield; scaffold creates toolchain)
- **Risk**: `Medium` - Money correctness + append-only enforcement; mitigated by Zod boundary + `$transaction` + `Restrict` FK + idempotency key
- **Verification Condition**: `bun test` green + `bunx tsc --noEmit` green + manual: post expense + client payment → TB debits == credits

## Atomic breakdown (1–4h each, dependency-ordered)

| ID | Task (1–4h) | Priority / Area / Type | Verifies |
|----|-------------|------------------------|----------|
| T1 | Scaffold Next.js App Router TS + Prisma + SQLite + Tailwind + `.env.example` (`DATABASE_URL="file:./ledger.db"`) | `#priority/p0`, `area:backend`, `type:feature` | scaffold boots `bun dev` |
| T2 | Schema + seed CoA (5 classes, codes from intake) + initial migration | `#priority/p0`, `area:data`, `type:feature` | AC-1 seed |
| T3 | Money + Zod contracts (`MoneyCentsSchema`, `PostJournalSchema` balance check) + unit tests | `#priority/p0`, `area:backend`, `type:test` | AC-2, AC-3 |
| T4 | `postJournal`/`reverseEntry` engine (`$transaction`, idempotency, `Restrict`) + tests | `#priority/p0`, `area:backend`, `type:feature` | AC-1, AC-2, AC-4 |
| T5 | Server Actions + Journal Form with live balance + error states | `#priority/p1`, `area:frontend`, `type:feature` | AC-1, AC-2 |
| T6 | TB + P&L queries + tables + empty states | `#priority/p1`, `area:frontend`, `type:feature` | AC-5, AC-6 |
| T7 | Hardening: no update/delete paths, double-submit guard, a11y pass, full verify | `#priority/p2`, `area:ui`, `type:refactor` | all AC |

## 3. Acceptance Criteria

- [x] **AC-1**: Seeded CoA lists 5 classes with intake codes; balanced journal persists atomically.
  - **Result**: `Complete — engine tested + UI built + user manual acceptance 2026-09-17`
  - **Evidence**: `bun test ledger.test.ts; JournalForm + createJournal; user accept`
  - Gherkin: `Given` seeded CoA `When` posting debits==credits `Then` entry + lines persist with shared entryId.
- [x] **AC-2**: Unbalanced journal fails closed with hard error, nothing persists.
  - **Result**: `Complete — engine fail-closed tested + form blocks submit + user manual acceptance 2026-09-17`
  - **Evidence**: `bun test ledger.test.ts (count unchanged); JournalForm indicator; user accept`
  - Gherkin: `Given` lines debits 1000/credits 999 `When` posting `Then` `Unbalanced` error and zero rows written.
- [x] **AC-3**: Money is integer cents only; floats rejected at boundary.
  - **Result**: `Complete — parser + schema + engine integration tested 2026-09-17`
  - **Evidence**: `bun test money.test.ts (10.10→1010, float/junk rejected)`
  - Gherkin: `Given` `$10.10` input `When` parsing `Then` `1010` cents; `Given` float `10.1` number `When` validating `Then` rejected.
- [x] **AC-4**: Posted entries immutable; corrections via linked reversal only; double reversal rejected.
  - **Result**: `Complete — engine tested + reversal UI built + user manual acceptance 2026-09-17`
  - **Evidence**: `bun test ledger.test.ts; JournalEntries + reverseJournal; user accept`
  - Gherkin: `Given` posted entry E `When` reversing with reason `Then` reversal R links `reversesId=E`; `When` reversing E again `Then` conflict error.
- [x] **AC-5**: Trial Balance balances after expense + client payment (user success signal).
  - **Result**: `Complete — engine tested + report page built + user manual acceptance 2026-09-17`
  - **Evidence**: `bun test ledger.test.ts; trial-balance page; user accept`
  - Gherkin: `Given` expense + payment posted `When` viewing TB `Then` total debits == total credits and per-account sums match.
- [x] **AC-6**: P&L shows revenue, expenses, net (revenue − expenses).
  - **Result**: `Complete — engine tested + report page built + user manual acceptance 2026-09-17`
  - **Evidence**: `bun test ledger.test.ts; profit-loss page; user accept`
  - Gherkin: `Given` client income + rent expense `When` viewing P&L `Then` revenue/expenses/net in cents displayed monospace.

## 4. Execution Policy

- **Mode**: `Gated Mode`
- **TDD Enforcement Mode**: `disabled`
- **Batch Authorization**: `N/A`
- **Soft Checkpoint**: `Around 60 minutes`
- **Hard Checkpoint**: `At or before 90 minutes`
- **Event-Driven Checkpoints**: `Milestone, task switch, scope expansion, handoff, compaction, or context drift`
- **Stop Conditions**: `Missing approval/context, failed verification/CI/invariant, blocker, hard checkpoint, or developer stop`
- **Host Timer Capability**: `No mechanical enforcement observed; manual checkpoints only`

## 5. State and Active Ownership

- **Execution State**: `completed`
- **Mapped `pk:tasks` Status**: `Done`
- **Active Task Pointer**: `None`
- **Start Time**: `2026-09-17 UTC`
- **Current Actor**: `Assistant`
- **Next Action**: `None — Milestone 1 complete; next milestone via pk:plan when ready`

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
|---|---|---|---|---|---|
| `N/A` | `planned` | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Task Record created from PLAN-core-ledger` | `docs/specs/2026-09-17-spec-core-ledger.md#PLAN-core-ledger` |
| `planned` | `in_progress` | `2026-09-17 UTC` | `Assistant` | `Human approved scaffold; readiness complete, active pointer claimed` | `User reply: scaffold` |
| `in_progress` | `awaiting_review` | `2026-09-17 UTC` | `Assistant` | `T1–T7 implementation + automated verification complete; manual browser acceptance outstanding (owner: user)` | `bun test 17 pass; dev smoke 5/5 200` |
| `awaiting_review` | `completed` | `2026-09-17 UTC` | `Assistant` | `User manual acceptance received; product commit 9a4f250 created, docs recorded in this commit` | `User reply: accept` |

## 6. Evidence and Completion Gate

- **Changed Files**:
  - `package.json` - LedgerCraft scripts (dev/build/lint/test/typecheck/db:migrate/db:seed) + prisma 7.10.0 + zod
  - `prisma/schema.prisma` - Account/JournalEntry/JournalLine + AccountType draft (unapplied, migration pending approval)
  - `prisma7.config.ts` - Prisma-generated config (DATABASE_URL from env)
  - `src/lib/db.ts` - PrismaBetterSqlite3 adapter singleton
  - `src/app/*`, `public/*`, configs - Next.js App Router + Tailwind scaffold (layout `LayoutProps` fixed)
  - `.env.example` - `DATABASE_URL="file:./ledger.db"` placeholder; `.gitignore` ignores `*.db`
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: `T1 2026-09-17: bunx prisma validate OK; prisma generate OK; bun run typecheck green; bun run lint green; bun run build OK (4 static routes). bun test N/A — no test files yet (T3). T2 2026-09-17: migrate dev init_core_ledger applied; ledger.db created; bun prisma/seed.ts → 15 accounts verified (5 classes, intake codes); typecheck+lint+build re-green after libsql adapter switch. T3 2026-09-17: bun test 10 pass / 0 fail (29 expects, money.test.ts + journal.test.ts); typecheck + lint green (added bun-types). T4 2026-09-17: bun test 17 pass / 0 fail (44 expects); isolated prisma/ledger.test.db via db push, cleaned after run; dev ledger.db untouched (15 accounts, 0 entries); typecheck + lint green. T5 2026-09-17: actions + JournalForm + entries/reversal + accounts/home pages; bun test 17 pass; typecheck + lint + build green (6 routes). Manual browser exercise of form pending T7. T6 2026-09-17: trial-balance + profit-loss pages (empty states, tabular numbers); bun test 17 pass; typecheck + lint + build green (8/8 routes). Manual post exercise pending T7. T7 2026-09-17: invariant grep clean (no journal update/delete/upsert, no any, no silent catch in app code; generated-client hits only); seed re-run idempotent (15/15); dev server smoke 5/5 routes 200 (/ accounts journal trial-balance profit-loss); final bun test 17 pass + typecheck + lint green; dev DB 15 accounts / 0 entries.`
- **Behavior IDs [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification [Required for Documentation, Configuration, or Research Work; Not applicable for Code Work]**: `N/A - Code Work`
- **CI Evidence**: `N/A`
- **Review Evidence**: `N/A`
- **Commit Evidence**: `9a4f250 feat(ledger): add double-entry core with balanced journal and reports; this commit docs(ledger): record phase 0 intake through milestone 1 task record`
- **Pull Request Evidence**: `N/A before PR`
- **Release Evidence**: `N/A`
- **Blocker and Resume Condition**: `None`


- **Completion State**: `[completed]`
- **Acceptance Results**: `AC-1 complete; AC-2 complete; AC-3 complete; AC-4 complete; AC-5 complete; AC-6 complete (user manual acceptance 2026-09-17)`
- **Changed-File Summary**: `Product: package.json, bun.lock, tsconfig.json, next.config.ts, next-env.d.ts, postcss.config.mjs, eslint.config.mjs, .gitignore, .env.example, prisma7.config.ts, prisma/schema.prisma, prisma/migrations/20260917054941_init_core_ledger/, prisma/seed.ts, src/app/*, src/components/*, src/actions/*, src/lib/*, src/types/*, src/generated/prisma/*, public/*. Docs: PROMPTKIT.md, docs/specs/2026-09-17-intake-ledgercraft.md, docs/specs/2026-09-17-spec-core-ledger.md, docs/tasks/TASK-2026-09-17-core-ledger.md, docs/STATE.md`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `Completed 2026-09-17 UTC by Assistant on user acceptance; product commit 9a4f250`
