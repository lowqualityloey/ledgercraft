# Scope Change Record: paths the plan named by feature, glob or the wrong directory

## 1. Identity and Approval Boundary

- **Record Type**: `Scope Change Record`
- **Scope Change ID**: `SCOPE-2026-09-17-invoicing-01`
- **Task ID**: `TASK-2026-09-17-invoicing`
- **Specification**: `docs/specs/2026-09-17-spec-invoicing.md`
- **Proposer / Actor**: `Assistant (implementation), recording retroactively`
- **Created**: `2026-09-23 UTC`
- **Approval Boundary**: `Retroactive record — no scope approval was requested at the time; written so the boundary question is traceable instead of invisible`

> Created after the fact on 2026-09-23, when validation reported changed files outside the
> task record's In Scope boundary. It documents what the plan already covered rather than
> authorising anything: the work had shipped and been accepted before this record existed.
> The original Task Record and its In Scope list are left as written.

## 2. Proposed Change

- **Reason or Discovery**: `Validation of the Task Record on 2026-09-23 reported 5 changed file(s) outside the recorded In Scope boundary. Each is a path the plan implied but did not itemize literally.`
- **Current Task Value**: `In Scope as recorded lists `prisma/schema.prisma`, `src/lib/invoicing.ts`, `src/app/clients/**` and `src/app/invoices/**` plus Server Actions, and places the tests at `tests/invoicing.test.ts`.`
- **Proposed Value**: `None — the In Scope list is not rewritten. The unenumerated paths are recorded here instead of being folded back into the historical plan.`
- **Affected Objective**: `None — the objective is unchanged.`
- **Affected Files or Artifacts**: ``prisma/migrations/20260917065632_add_clients_invoicing/migration.sql`; `src/lib/invoicing.test.ts`; `src/actions/invoicing.ts`; `src/components/ClientForm.tsx`; `src/app/clients/page.tsx``
- **Affected Acceptance Criteria**: `None — the criteria are unchanged and remain at Pass.`
- **Affected Dependencies**: `None`
- **New or Changed Non-Goals**: `None`
- **Risk / Estimate Impact**: `Low — no product behaviour changes as a result of this record; it is bookkeeping.`
- **Changed Verification Condition**: `None — the same gate applied throughout: tests, typecheck, lint and build green, plus the dev-server smoke pass.`

## 3. Impact and Disposition

- **Disposition**: `Within existing scope — each path is the planned change wearing different notation. The migration is the generated output of the planned schema change; the plan put the tests in `tests/` where they do not live (`src/lib/invoicing.test.ts`); "+ Server Actions" and the `/clients` UI were planned as features without file paths; and `src/app/clients/**` is a glob that does not literally contain `src/app/clients/page.tsx`.`
- **Independent Work Discovered**: `None`
- **Required Human Confirmation**: `Not required — nothing outside the agreed objective changed. Recorded for traceability, since validation flagged the boundary.`
- **Required New Task Record**: `N/A`
- **Block Until Resolved**: `No`

## 4. Approval and Evidence

- **Decision**: `Accepted retroactively (recorded 2026-09-23)`
- **Approver**: `N/A — no separate scope approval was sought or given, at the time or since`
- **Decision Timestamp**: `2026-09-23 UTC (record created, no decision event)`
- **Approval Evidence**: `Milestone 2 acceptance — the task record's Acceptance Results (user acceptance) and Completion Decision; commits `b2f9e1f` + `1e3361f`.`
- **Related Checkpoint**: `N/A`
- **Related Handoff**: `N/A`
- **Branch / Revision**: `main @ b2f9e1f + 1e3361f`
- **Verification Plan or Result**: `Result — the gate was green at completion, as recorded in the Task Record's Verification Evidence: bun test 30 pass / 0 fail, tsc exit 0, eslint exit 0, build exit 0 (8 of 8 routes), dev smoke 5 of 5. Nothing was re-run for this record.`
- **Blocker and Resume Condition**: `None`

## 5. Resolution

- **Previous Task State**: `in_progress` *(the paths were touched while the task was being implemented)*
- **Resulting Task State**: `completed`
- **Task Record Updated**: `docs/tasks/TASK-2026-09-17-invoicing.md — section 6/7's Scope Change Records now links this record`
- **New Task / Exception Links**: `None`
- **Changed Scope Summary**: `Five paths recorded within the existing scope: one generated migration, one plan/actual directory mismatch in the test path, and three files whose features were planned but whose paths were not itemized or were written as a glob.`
- **Next Action**: `None — closed; the boundary findings are recorded here and linked from the Task Record.`
- **Recorded By and Timestamp**: `Assistant — 2026-09-23 UTC`
