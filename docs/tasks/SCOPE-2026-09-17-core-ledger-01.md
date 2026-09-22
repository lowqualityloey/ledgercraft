# Scope Change Record: scaffold and config paths the plan named only in its breakdown

## 1. Identity and Approval Boundary

- **Record Type**: `Scope Change Record`
- **Scope Change ID**: `SCOPE-2026-09-17-core-ledger-01`
- **Task ID**: `TASK-2026-09-17-core-ledger`
- **Specification**: `docs/specs/2026-09-17-spec-core-ledger.md`
- **Proposer / Actor**: `Assistant (implementation), recording retroactively`
- **Created**: `2026-09-23 UTC`
- **Approval Boundary**: `Retroactive record — no scope approval was requested at the time; written so the boundary question is traceable instead of invisible`

> Created after the fact on 2026-09-23, when validation reported changed files outside the
> task record's In Scope boundary. It documents what the plan already covered rather than
> authorising anything: the work had shipped and been accepted before this record existed.
> The original Task Record and its In Scope list are left as written.

## 2. Proposed Change

- **Reason or Discovery**: `Validation of the Task Record on 2026-09-23 reported 5 changed file(s) outside the recorded In Scope boundary. Each is a path the plan implied but did not itemize literally.`
- **Current Task Value**: `In Scope as recorded lists the schema, `lib/money.ts` and `lib/ledger.ts` (both without the `src/` prefix), the server actions, the pages and the tests — but not the Next.js/Prisma scaffold or its config files.`
- **Proposed Value**: `None — the In Scope list is not rewritten. The unenumerated paths are recorded here instead of being folded back into the historical plan.`
- **Affected Objective**: `None — the objective is unchanged.`
- **Affected Files or Artifacts**: ``package.json`; `prisma7.config.ts`; `src/lib/db.ts`; `src/app/*`; `.env.example``
- **Affected Acceptance Criteria**: `None — the criteria are unchanged and remain at Pass.`
- **Affected Dependencies**: `None`
- **New or Changed Non-Goals**: `None`
- **Risk / Estimate Impact**: `Low — no product behaviour changes as a result of this record; it is bookkeeping.`
- **Changed Verification Condition**: `None — the scaffold had to produce a working `bun dev` and a green gate, which is what T1's own verification condition says.`

## 3. Impact and Disposition

- **Disposition**: `Within existing scope — these are the scaffold and tooling files the record's own Atomic breakdown planned as T1 ("Scaffold Next.js App Router TS + Prisma + SQLite + Tailwind + `.env.example`"). The plan described them by feature, and In Scope simply did not enumerate them. `lib/money.ts` and `lib/ledger.ts` were likewise written without their `src/` prefix.`
- **Independent Work Discovered**: `None`
- **Required Human Confirmation**: `Not required — nothing outside the agreed objective changed. Recorded for traceability, since validation flagged the boundary.`
- **Required New Task Record**: `N/A`
- **Block Until Resolved**: `No`

## 4. Approval and Evidence

- **Decision**: `Accepted retroactively (recorded 2026-09-23)`
- **Approver**: `N/A — no separate scope approval was sought or given, at the time or since`
- **Decision Timestamp**: `2026-09-23 UTC (record created, no decision event)`
- **Approval Evidence**: `Milestone 1 acceptance — the task record's Acceptance Results (user manual acceptance) and Completion Decision; the scaffold commit `9a4f250` was accepted with it.`
- **Related Checkpoint**: `N/A`
- **Related Handoff**: `N/A`
- **Branch / Revision**: `main @ 9a4f250`
- **Verification Plan or Result**: `Result — the gate was green at completion, as recorded in the Task Record's Verification Evidence: bun test 17 pass / 0 fail, tsc --noEmit exit 0, eslint exit 0, build exit 0 (8 routes). Nothing was re-run for this record.`
- **Blocker and Resume Condition**: `None`

## 5. Resolution

- **Previous Task State**: `in_progress` *(the paths were touched while the task was being implemented)*
- **Resulting Task State**: `completed`
- **Task Record Updated**: `docs/tasks/TASK-2026-09-17-core-ledger.md — section 6/7's Scope Change Records now links this record`
- **New Task / Exception Links**: `None`
- **Changed Scope Summary**: `Five scaffold and config paths recorded within the existing scope. All five are T1 outputs of the planned scaffold, not additions to it; the recorded In Scope list is left as written rather than back-filled.`
- **Next Action**: `None — closed; the boundary findings are recorded here and linked from the Task Record.`
- **Recorded By and Timestamp**: `Assistant — 2026-09-23 UTC`
