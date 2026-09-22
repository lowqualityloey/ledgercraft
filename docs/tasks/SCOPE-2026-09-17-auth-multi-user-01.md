# Scope Change Record: the migration file and a component the plan named only by symbol

## 1. Identity and Approval Boundary

- **Record Type**: `Scope Change Record`
- **Scope Change ID**: `SCOPE-2026-09-17-auth-multi-user-01`
- **Task ID**: `TASK-2026-09-17-auth-multi-user`
- **Specification**: `docs/specs/2026-09-17-spec-auth-multi-user.md`
- **Proposer / Actor**: `Assistant (implementation), recording retroactively`
- **Created**: `2026-09-23 UTC`
- **Approval Boundary**: `Retroactive record — no scope approval was requested at the time; written so the boundary question is traceable instead of invisible`

> Created after the fact on 2026-09-23, when validation reported changed files outside the
> task record's In Scope boundary. It documents what the plan already covered rather than
> authorising anything: the work had shipped and been accepted before this record existed.
> The original Task Record and its In Scope list are left as written.

## 2. Proposed Change

- **Reason or Discovery**: `Validation of the Task Record on 2026-09-23 reported 2 changed file(s) outside the recorded In Scope boundary. Each is a path the plan implied but did not itemize literally.`
- **Current Task Value**: `In Scope as recorded names the migration directory as `prisma/migrations/*_add_auth` (no file), and refers to the logout control as `LogoutButton` without a path.`
- **Proposed Value**: `None — the In Scope list is not rewritten. The unenumerated paths are recorded here instead of being folded back into the historical plan.`
- **Affected Objective**: `None — the objective is unchanged.`
- **Affected Files or Artifacts**: ``prisma/migrations/*_add_auth/migration.sql`; `src/components/LogoutButton.tsx``
- **Affected Acceptance Criteria**: `None — the criteria are unchanged and remain at Pass.`
- **Affected Dependencies**: `None`
- **New or Changed Non-Goals**: `None`
- **Risk / Estimate Impact**: `Low — no product behaviour changes as a result of this record; it is bookkeeping.`
- **Changed Verification Condition**: `None — the auth invariants (bcrypt cost 10, 64-hex session tokens, cookie `httpOnly`, the middleware gate) were verified as planned.`

## 3. Impact and Disposition

- **Disposition**: `Within existing scope — both are notation: the migration is the generated output of the planned `User`/`Session` schema change, and the plan identified the component by symbol only.`
- **Independent Work Discovered**: `None`
- **Required Human Confirmation**: `Not required — nothing outside the agreed objective changed. Recorded for traceability, since validation flagged the boundary.`
- **Required New Task Record**: `N/A`
- **Block Until Resolved**: `No`

## 4. Approval and Evidence

- **Decision**: `Accepted retroactively (recorded 2026-09-23)`
- **Approver**: `N/A — no separate scope approval was sought or given, at the time or since`
- **Decision Timestamp**: `2026-09-23 UTC (record created, no decision event)`
- **Approval Evidence**: `Milestone 5 acceptance — the task record's Acceptance Results (user acceptance) and Completion Decision; commits `cde43b5` + `df3b5de`.`
- **Related Checkpoint**: `N/A`
- **Related Handoff**: `N/A`
- **Branch / Revision**: `main @ cde43b5 + df3b5de`
- **Verification Plan or Result**: `Result — the gate was green at completion, as recorded in the Task Record's Verification Evidence: bun test 53 pass / 0 fail, tsc exit 0, eslint exit 0, build exit 0, curl matrix unauthed 307 × 7 and authed 200. Nothing was re-run for this record.`
- **Blocker and Resume Condition**: `None`

## 5. Resolution

- **Previous Task State**: `in_progress` *(the paths were touched while the task was being implemented)*
- **Resulting Task State**: `completed`
- **Task Record Updated**: `docs/tasks/TASK-2026-09-17-auth-multi-user.md — section 6/7's Scope Change Records now links this record`
- **New Task / Exception Links**: `None`
- **Changed Scope Summary**: `Two paths recorded within the existing scope: the generated migration for the planned auth tables, and the logout component the plan referred to by symbol.`
- **Next Action**: `None — closed; the boundary findings are recorded here and linked from the Task Record.`
- **Recorded By and Timestamp**: `Assistant — 2026-09-23 UTC`
