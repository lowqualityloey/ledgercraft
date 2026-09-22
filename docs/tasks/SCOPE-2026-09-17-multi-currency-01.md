# Scope Change Record: the migration file and a component path abbreviated in the plan

## 1. Identity and Approval Boundary

- **Record Type**: `Scope Change Record`
- **Scope Change ID**: `SCOPE-2026-09-17-multi-currency-01`
- **Task ID**: `TASK-2026-09-17-multi-currency`
- **Specification**: `docs/specs/2026-09-17-spec-multi-currency.md`
- **Proposer / Actor**: `Assistant (implementation), recording retroactively`
- **Created**: `2026-09-23 UTC`
- **Approval Boundary**: `Retroactive record — no scope approval was requested at the time; written so the boundary question is traceable instead of invisible`

> Created after the fact on 2026-09-23, when validation reported changed files outside the
> task record's In Scope boundary. It documents what the plan already covered rather than
> authorising anything: the work had shipped and been accepted before this record existed.
> The original Task Record and its In Scope list are left as written.

## 2. Proposed Change

- **Reason or Discovery**: `Validation of the Task Record on 2026-09-23 reported 2 changed file(s) outside the recorded In Scope boundary. Each is a path the plan implied but did not itemize literally.`
- **Current Task Value**: `In Scope as recorded names the migration directory as `prisma/migrations/*_add_currency` (no file), and lists `src/components/InvoiceList.tsx` / `InvoiceReceipt.tsx` — the second component without its path.`
- **Proposed Value**: `None — the In Scope list is not rewritten. The unenumerated paths are recorded here instead of being folded back into the historical plan.`
- **Affected Objective**: `None — the objective is unchanged.`
- **Affected Files or Artifacts**: ``prisma/migrations/*_add_currency/migration.sql`; `src/components/InvoiceReceipt.tsx``
- **Affected Acceptance Criteria**: `None — the criteria are unchanged and remain at Pass.`
- **Affected Dependencies**: `None`
- **New or Changed Non-Goals**: `None`
- **Risk / Estimate Impact**: `Low — no product behaviour changes as a result of this record; it is bookkeeping.`
- **Changed Verification Condition**: `None — the FX invariant (foreign total → base total, `Dr 1200 / Cr 4000` at `baseTotalCents`) was verified unchanged, as the record's AC evidence shows.`

## 3. Impact and Disposition

- **Disposition**: `Within existing scope — both are notation: the plan named the migration directory rather than the file the generator writes into it, and abbreviated the second component's path because it shares the first one's prefix.`
- **Independent Work Discovered**: `None`
- **Required Human Confirmation**: `Not required — nothing outside the agreed objective changed. Recorded for traceability, since validation flagged the boundary.`
- **Required New Task Record**: `N/A`
- **Block Until Resolved**: `No`

## 4. Approval and Evidence

- **Decision**: `Accepted retroactively (recorded 2026-09-23)`
- **Approver**: `N/A — no separate scope approval was sought or given, at the time or since`
- **Decision Timestamp**: `2026-09-23 UTC (record created, no decision event)`
- **Approval Evidence**: `Milestone 6 acceptance — the task record's Acceptance Results (user acceptance) and Completion Decision; commit `476437b`.`
- **Related Checkpoint**: `N/A`
- **Related Handoff**: `N/A`
- **Branch / Revision**: `main @ 476437b`
- **Verification Plan or Result**: `Result — the gate was green at completion, as recorded in the Task Record's Verification Evidence: bun test 62 pass / 0 fail, tsc exit 0, eslint exit 0, build exit 0, trial balance balanced. Nothing was re-run for this record.`
- **Blocker and Resume Condition**: `None`

## 5. Resolution

- **Previous Task State**: `in_progress` *(the paths were touched while the task was being implemented)*
- **Resulting Task State**: `completed`
- **Task Record Updated**: `docs/tasks/TASK-2026-09-17-multi-currency.md — section 6/7's Scope Change Records now links this record`
- **New Task / Exception Links**: `None`
- **Changed Scope Summary**: `Two paths recorded within the existing scope: the generated migration for the planned currency columns, and a component whose full path the plan abbreviated.`
- **Next Action**: `None — closed; the boundary findings are recorded here and linked from the Task Record.`
- **Recorded By and Timestamp**: `Assistant — 2026-09-23 UTC`
