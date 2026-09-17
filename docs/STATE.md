# Project State & Living Execution Tracker

## 1. Executive Summary & Current Position
- **Project Name**: LedgerCraft
- **Current Milestone / Epic**: Milestone 0: Intake Baseline (Phase 0 complete) → Next: Milestone 1 Core Ledger via `pk:plan`
- **Overall Status**: ACTIVE <!-- Options: ACTIVE | PAUSED | STABILIZING | RELEASE_CANDIDATE | COMPLETED (all milestones closed, release evidence archived, zero open blockers — recording stops here) -->
- **Target Release / Deadline**: none (local-only Phase 0)
- **Current Working Branch**: main
- **Last Updated**: 2026-09-17

---

## 2. Milestone & Task Progress

### Milestone Roadmap
- [x] **Milestone 0**: Phase 0 Intake Baseline — MVP floor + Later ledger + invariants locked (2026-09-17)
- [x] **Milestone 1**: Core Ledger Engine (CoA + balanced journal + TB/P&L) — completed 2026-09-17 (`9a4f250`, `8484fc6`)

### Active Milestone Task Breakdown
Track tasks using atomic checklists (`[x]` Done, `[/]` In Progress, `[ ]` Queued, `[!]` Blocked):

- [x] TASK-2026-09-17-core-ledger T1: Scaffold (p0) — green 2026-09-17
- [x] TASK-2026-09-17-core-ledger T2: Schema + seed CoA (p0) — 15 accounts 2026-09-17
- [x] TASK-2026-09-17-core-ledger T3: Money + Zod contracts + tests (p0) — 10 pass 2026-09-17
- [x] TASK-2026-09-17-core-ledger T4: Engine post/reverse + tests (p0) — 17 pass 2026-09-17
- [x] TASK-2026-09-17-core-ledger T5: Actions + Journal Form (p1) — build green 2026-09-17
- [x] TASK-2026-09-17-core-ledger T6: TB + P&L (p1) — 8/8 routes 2026-09-17
- [x] TASK-2026-09-17-core-ledger T7: Hardening + verify (p2) — grep clean, smoke 5/5 2026-09-17
- [x] Manual acceptance (owner: user): expense + client payment posted, Trial Balance balances — accepted 2026-09-17

---

## 3. Active Working Set
- **Target Workspace / Package (if Monorepo)**: standalone (N/A)
- **Active RFC / Spec**: `docs/specs/2026-09-17-spec-core-ledger.md` (Draft, Full; intake: `docs/specs/2026-09-17-intake-ledgercraft.md`)
- **Active Task Spec**: `docs/tasks/TASK-2026-09-17-core-ledger.md` (planned, TDD disabled)
- **Key Source Files in Flight**: `src/lib/ledger.ts`, `src/actions/ledger.ts`, `src/components/JournalForm.tsx`, `src/components/JournalEntries.tsx`, `src/app/journal/page.tsx`, `prisma/schema.prisma` (applied)
- **Verification Commands (Scoped)**:
  - Unit Tests: `bun test` (17 pass / 0 fail 2026-09-17)
  - Typecheck: `bunx tsc --noEmit` (green 2026-09-17)
  - Linter: `bun run lint` (green 2026-09-17)
  - Build: `bun run build` (OK 2026-09-17, 4 static routes)

---

## 3A. Execution-Control Projection (Optional)

> This section is a synchronized projection for checkpoint continuity when the host project uses Controlled Work. The canonical authority remains `docs/tasks/<task-id>.md`; disagreement with that record is a validation failure and leaves execution blocked or `checkpoint_due` until reconciled.

- **Local Task Source**: `docs/tasks/<task-id>.md`
- **Task ID**: `TASK-[YYYY-MM-DD]-[slug]`
- **Task Record**: `docs/tasks/<task-id>.md`
- **Specification**: `docs/specs/[specification].md`
- **Execution Scope**: `[Repository, workspace, package, or session boundary]`
- **Execution State**: `[planned | ready | in_progress | checkpoint_due | blocked | paused | handoff_ready | awaiting_review | completed | aborted]`
- **Mapped `pk:tasks` Status**: `[To Do | In Progress | In Review | Done]`
- **Active Task Pointer**: `[Task ID while active, otherwise None]`
- **Owner / Current Actor**: `[Person, role, agent, or session]`
- **Start Time**: `[YYYY-MM-DD HH:MM UTC or N/A]`
- **Current Branch**: `[Branch name]`
- **Current Revision**: `[Exact commit or revision]`
- **Checkpoint Policy**: `[Soft/hard intervals, event triggers, and host timer capability/limitation]`
- **Blockers and Resume Condition**: `[Blocker, owner, evidence, and precise condition, or None]`
- **Verification Status**: `[Commands, results, and timestamp]`
- **CI Evidence**: `[Provider, workflow/job, run, revision, result, or N/A]`
- **Changed-File Summary**: `[Current working set summary]`
- **Latest Checkpoint**: `[Record path or None]`
- **Latest Handoff**: `[Record path or None]`
- **Next Action**: `[Exactly one prioritized action]`

---

## 3B. Release-Evaluation Handoff (Optional)

> Use this projection only when PromptKit OS release evaluation is being handed from QA/Reviewer to a Release Coordinator. It is a durable handoff, not approval, and the canonical evaluation or Task Record remains authoritative.

- **Evaluation ID**: `[evaluation ID or N/A]`
- **Release Candidate Commit**: `[exact candidate revision or N/A]`
- **Preliminary SemVer Candidate**: `[preliminary version, including prerelease identifier when applicable, or N/A]`
- **QA/Reviewer Result**: `[Pass | Fail | Pending | N/A]`
- **Unresolved Blockers**: `[blocker, owner, and resolution condition, or None]`
- **Requested Release Coordinator Decision / Next Approval Action**: `[exact human decision requested, or N/A]`
- **Handoff Status**: `[Ready for Coordinator Review | Blocked | Deferred | N/A]`
- **Approval Boundary**: `This projection does not approve a candidate or version and does not authorize tag creation, hosted release creation, changelog publication, remote operations, deployment, or rollback.`
- **Source Evaluation / Task Record**: `[authoritative record path or N/A]`

---

## 4. Locked Technical Invariants (Do Not Undo)
Document non-negotiable architectural decisions agreed upon during pairing sessions:
- **INV-01 Double-Entry Balance** (2026-09-17, user): Sum(Debits)==Sum(Credits) per transaction; unbalanced → hard validation error, fail to persist. Source: intake + `PROMPTKIT.md` §7.
- **INV-02 Monetary Precision** (2026-09-17, user): Integer minor units only ($10.00=1000); never float. Source: intake + `PROMPTKIT.md` §7.
- **INV-03 Append-Only Journal** (2026-09-17, user): No update/delete of posted entries; corrections via reversing entries. Source: intake + `PROMPTKIT.md` §7.
- **INV-04 Local Single-Owner Phase 0** (2026-09-17, user): No auth, single SQLite `ledger.db`, `bun dev` local-only. Source: `docs/specs/2026-09-17-intake-ledgercraft.md`.

---

## 4A. Candidate Learnings (Unpromoted)

Staging area for rules observed during sessions but not yet approved as invariants. Entries here are **never pre-filled** and are non-authoritative: agents must not treat them as policy, quote them as invariants, or copy them into project guardrails. Promotion requires a recorded human decision (`approved` / `rejected` / `deferred`) with approver, date, evidence reference, and destination (see `protocols/context-sync.md` §3.1).

| Date | Proposed Rule | Source / Evidence | Scope | Status | Human Decision (approver, date, destination) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| not tracked | not tracked | not tracked | not tracked | not tracked | not tracked |

---

## 5. Known Blockers, Risks & Open Questions
- **Blockers**: none
- **Architectural Questions**:
  - Confirm size stays `medium` vs downgrade to `small` during `pk:plan` (ASSUMPTION-03).
  - Prisma schema + Server Action boundaries to be designed in `pk:plan` (no code yet).
- **Technical Debt & Risks**: none (greenfield, no code)
- **Later ledger (deferred, not backlog)**: invoicing, clients, PDF generation, bank CSV imports, auth/multi-user, multi-currency auto-conversion, Stripe webhooks.

---

## 6. Recent Architectural Decisions (ADR Log)
| Date | Title & Scope | Decision Summary | ADR File |
| :--- | :--- | :--- | :--- |
| not tracked | not tracked | not tracked | not tracked |

---

## 7. Next Immediate Actions (Queued)
1. Run `pk:plan` for Milestone 1 (CoA + balanced journal + TB/P&L, SQLite/Prisma schema, Server Actions, validation + reversal design).
2. Then `pk:tasks` to decompose Milestone 1 into atomic tasks.
3. Scaffold Next.js + Prisma + bun (creates package.json, prisma/schema.prisma) — pending plan approval.

---

## 8. Session Continuity Log
Compact record of pairing sessions to enable instant chat resumption:

| Date | Engineer / Agent | Milestone / Focus | Key Changes & Artifacts |
| :--- | :--- | :--- | :--- |
| 2026-09-17 | Assistant (pk:onboard) | Project Intake (Greenfield Phase 0) | Generated intake `docs/specs/2026-09-17-intake-ledgercraft.md`, updated PROMPTKIT.md (medium/complete), initialized STATE.md baseline |

---

## 9. Session Spend Ledger

| Session | Turns | Measured in/out | Estimated payload | Note |
| :--- | :--- | :--- | :--- | :--- |
| not tracked | not tracked | not tracked | not tracked | not tracked |

- **Running total**: not tracked — refreshed by `pk:checkpoint`; one row per real work session (trivial sessions under ~5 turns with no workflow usage write nothing).
