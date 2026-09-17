# Project State & Living Execution Tracker

## 1. Executive Summary & Current Position
- **Project Name**: LedgerCraft
- **Current Milestone / Epic**: Milestones 1–4 shipped (2026-09-17) → Milestone 5 Auth/Multi-User scoped (PLAN-auth-multi-user + Task Record `ready` 2026-09-17)
- **Overall Status**: ACTIVE <!-- Options: ACTIVE | PAUSED | STABILIZING | RELEASE_CANDIDATE | COMPLETED (all milestones closed, release evidence archived, zero open blockers — recording stops here) -->
- **Target Release / Deadline**: none (local-only; M5 local `bun dev` + `AUTH_SECRET` in `.env`)
- **Current Working Branch**: main (`9c36976` → M5.1 commit pending)
- **Last Updated**: 2026-09-17 (M5.1 `in_progress` — schema+domain landed, 53/53 green)

---

## 2. Milestone & Task Progress

### Milestone Roadmap
- [x] **Milestone 0**: Phase 0 Intake Baseline — MVP floor + Later ledger + invariants locked (2026-09-17)
- [x] **Milestone 1**: Core Ledger Engine (CoA + balanced journal + TB/P&L) — completed 2026-09-17 (`9a4f250` product, `6dc9529` docs)
- [x] **Milestone 2**: Clients + Invoicing (accrual, full-pay) — shipped 2026-09-17 (T1–T4 + user acceptance, `1e3361f`)
- [x] **Milestone 3**: Bank CSV Import (drafts + balanced post + dedup) — shipped 2026-09-17 (M3.1–M3.4 + user acceptance, `539de27`)
- [x] **Milestone 4**: Invoice PDF Receipts (read-only receipt + browser print CSS, zero deps) — shipped 2026-09-17 (M4.1–M4.3 + spec, `9c36976`)
- [ ] **Milestone 5**: Auth / Multi-User Accountant Login (shared ledger gate) — `in_progress` 2026-09-17 (`PLAN-auth-multi-user` + `TASK-2026-09-17-auth-multi-user` `in_progress` M5.1); Later remainder → multi-currency, Stripe

### Active Milestone Task Breakdown
Track tasks using atomic checklists (`[x]` Done, `[/]` In Progress, `[ ]` Queued, `[!]` Blocked):

- [x] TASK-2026-09-17-core-ledger T1: Scaffold (p0) — green 2026-09-17
- [x] TASK-2026-09-17-core-ledger T2: Schema + seed CoA (p0) — 15 accounts 2026-09-17
- [x] TASK-2026-09-17-core-ledger T3: Money + Zod contracts + tests (p0) — 10 pass 2026-09-17
- [x] TASK-2026-09-17-core-ledger T4: Engine post/reverse + tests (p0) — 17 pass 2026-09-17
- [x] TASK-2026-09-17-core-ledger T5: Actions + Journal Form (p1) — build green 2026-09-17
- [x] TASK-2026-09-17-core-ledger T6: TB + P&L (p1) — 8/8 routes 2026-09-17
- [x] TASK-2026-09-17-core-ledger T7: Hardening + verify (p2) — grep clean, smoke 5/5 2026-09-17
- [x] TASK-2026-09-17-invoicing T1: Schema + seed refs (p0) — done 2026-09-17 (migration applied, tsc+17 tests green)
- [x] TASK-2026-09-17-invoicing T2: Engine + unit tests (p0) — done 2026-09-17 (13 new, 30/30 green)
- [x] TASK-2026-09-17-invoicing T3: Actions + UI (p1) — done 2026-09-17 (build 8/8, smoke 5/5)
- [x] TASK-2026-09-17-invoicing T4: Reports wiring + hardening (p2) — done 2026-09-17 (grep clean, full gate green)
- [x] Manual acceptance M2 (owner: user): client → invoice → paid, TB balances — accepted 2026-09-17 (totals not reported)
- [x] TASK-2026-09-17-csv-import M3.1: Schema (p0) — done 2026-09-17 (migration applied, tsc+30 tests green)
- [x] TASK-2026-09-17-csv-import M3.2: Engine + unit tests (p0) — done 2026-09-17 (14 new, 44/44 green)
- [x] TASK-2026-09-17-csv-import M3.3: Actions + UI (p1) — done 2026-09-17 (build 9/9, fresh :3000 smoke 7/7)
- [x] TASK-2026-09-17-csv-import M3.4: Hardening + verify (p2) — done 2026-09-17 (grep clean, full gate green)
- [x] Manual acceptance M3 (owner: user): real bank CSV → post → TB balances → re-upload rejected — accepted 2026-09-17
- [x] Manual acceptance M1 (owner: user): expense + client payment posted, Trial Balance balances — accepted 2026-09-17
- [x] M4.1 Receipt view + route (p0) — done 2026-09-17 (`getInvoiceReceipt` + `/invoices/[id]` + `InvoiceReceipt`)
- [x] M4.2 Print CSS + Print button (p1) — done 2026-09-17 (`PrintButton` + `@media print` + Receipt links)
- [x] M4.3 Hardening + verify (p2) — done 2026-09-17 (44/44 green, tsc/lint clean, build 10/10)
- [x] Manual acceptance M4 (owner: user): receipt `/invoices/[id]` + Print preview receipt-only — accepted 2026-09-17 (fresh :3000 smoke 200, invalid 404)
- [/] TASK-2026-09-17-auth-multi-user M5.1 Schema + seed + domain (p0) — `in_progress` 2026-09-17 (User/Session + bcryptjs + opaque token, 53/53 green)
- [ ] TASK-2026-09-17-auth-multi-user M5.2 Actions + middleware gate (p0) — queued 2026-09-17 (login/logout + 302 logic + /login)
- [ ] TASK-2026-09-17-auth-multi-user M5.3 Wiring + regression (p1) — queued 2026-09-17 (requireSession on all protected actions, 44+ regression)
- [ ] TASK-2026-09-17-auth-multi-user M5.4 Hardening + verify (p2) — queued 2026-09-17 (cookie audit + curl matrix + .env hygiene)

---

## 3. Active Working Set
- **Target Workspace / Package (if Monorepo)**: standalone (N/A)
- **Active RFC / Spec**: `docs/specs/2026-09-17-spec-auth-multi-user.md` (`PLAN-auth-multi-user`, Full, `ready` 2026-09-17 — M5 accountant login, accountant pain)
- **Active Task Spec**: `docs/tasks/TASK-2026-09-17-auth-multi-user.md` (`in_progress` M5.1; TDD `disabled`)
- **Key Source Files in Flight**: `prisma/schema.prisma`, `src/lib/auth.ts`, `src/lib/session.ts`, `src/lib/auth.test.ts`, `prisma/seed.ts` (M5.1 landed)
- **Verification Commands (Scoped)**:
  - Unit Tests: `bun test` (44 pass / 0 fail 2026-09-17; M5 will be 44+ new)
  - Typecheck: `bunx tsc --noEmit` (green 2026-09-17)
  - Linter: `bun run lint` (green 2026-09-17)
  - Build: `bun run build` (OK 2026-09-17, 10 routes incl. `ƒ /invoices/[id]`; M5 will be `ƒ /login`)

---

## 3A. Execution-Control Projection (Optional)

> This section is a synchronized projection for checkpoint continuity when the host project uses Controlled Work. The canonical authority remains `docs/tasks/<task-id>.md`; disagreement with that record is a validation failure and leaves execution blocked or `checkpoint_due` until reconciled.

- **Local Task Source**: `docs/tasks/TASK-2026-09-17-auth-multi-user.md`
- **Task ID**: `TASK-2026-09-17-auth-multi-user`
- **Task Record**: `docs/tasks/TASK-2026-09-17-auth-multi-user.md`
- **Specification**: `docs/specs/2026-09-17-spec-auth-multi-user.md`
- **Execution Scope**: `Repository standalone (single Next.js app + local SQLite)`
- **Execution State**: `in_progress`
- **Mapped `pk:tasks` Status**: `In Progress`
- **Active Task Pointer**: `TASK-2026-09-17-auth-multi-user`
- **Owner / Current Actor**: `Assistant (M5.1)`
- **Start Time**: `2026-09-17 UTC`
- **Current Branch**: `main`
- **Current Revision**: `9c36976`
- **Checkpoint Policy**: `Soft ~60m, hard ≤90m; event-driven on milestone/task/scope/handoff/compaction`
- **Blockers and Resume Condition**: `None`
- **Verification Status**: `bun test 53/0 + tsc clean + lint clean + build 11 routes 2026-09-17 (M5.1); gate: bun test + tsc + lint + build + curl matrix`
- **CI Evidence**: `N/A`
- **Changed-File Summary**: `M5.1 landed: prisma/schema User/Session + bcryptjs domain + auth.test.ts (53/53)`
- **Latest Checkpoint**: `None`
- **Latest Handoff**: `None`
- **Next Action**: `Build M5.2 Actions + middleware gate`

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
- **Blockers**: none (M5 `in_progress` M5.1 done — next M5.2)
- **Architectural Questions**:
  - M5 scoped as auth/multi-user (accountant login, shared ledger gate) — built from `PLAN-auth-multi-user`; multi-currency + Stripe remain as Later remainder.
  - Remote/GitHub setup open (no remote; `pk:pr` blocked until remote added — `tracking: github` in `PROMPTKIT.md` but local record is authoritative).
- **Technical Debt & Risks**:
  - Pre-existing init dirt untracked (`.clinerules/`, `.github/`, `.gitmodules`, `.opencode/`, `.promptkit/`, `AGENTS.md`) — surfaced, never staged; decide keep/commit separately.
  - Generated Prisma client (`src/generated/`) gitignored — fresh clones must run `bunx prisma generate`.
  - INV-04 evolution in M5: "no auth, local single-owner" → "auth wall, shared ledger (2 users), still local SQLite"; row-level tenant isolation deferred — track as risk if accountant read-only is needed (see `ASSUMPTION-auth-multi-user-002`).
- **Later ledger (deferred, not backlog)**: multi-currency auto-conversion, Stripe webhooks. Shipped out of it: invoicing + clients (M2), bank CSV imports (M3), PDF receipts via browser print (M4), auth/multi-user now M5 scoped.

---

## 6. Recent Architectural Decisions (ADR Log)
| Date | Title & Scope | Decision Summary | ADR File |
| :--- | :--- | :--- | :--- |
| not tracked | not tracked | not tracked | not tracked |

---

## 7. Next Immediate Actions (Queued)
1. Build M5.2 Actions + middleware gate (login/logout + `src/middleware.ts` + `/login` → AC-1/AC-2).
2. Then M5.3 wiring + regression (`requireSession` on all actions, 53+ green) → M5.4 hardening + verify.
3. Optional: add git remote + `pk:pr` for review; decide fate of untracked init dirt.
4. `bun dev` daily driver (`:3000` fresh): journal at `/journal`, invoices at `/invoices` (+ receipts at `/invoices/[id]`), imports at `/imports`, reports at `/trial-balance` + `/profit-loss` — all behind 302 to `/login` once M5.2 lands.

---

## 8. Session Continuity Log
Compact record of pairing sessions to enable instant chat resumption:

| Date | Engineer / Agent | Milestone / Focus | Key Changes & Artifacts |
| :--- | :--- | :--- | :--- |
| 2026-09-17 | Assistant (pk:onboard) | Project Intake (Greenfield Phase 0) | Generated intake `docs/specs/2026-09-17-intake-ledgercraft.md`, updated PROMPTKIT.md (medium/complete), initialized STATE.md baseline |
| 2026-09-17 | Assistant (pk:plan→tasks→build→commit) | Milestone 1 Core Ledger (completed) | Spec + Task Record; T1–T7 (scaffold, migration+seed, contracts, engine, UI, reports, hardening); 17 tests green; commits `9a4f250` + `6dc9529`; checkpoint/handoff `-01` |
| 2026-09-17 | Assistant (pk:plan→tasks→build→commit) | Milestone 2 Clients + Invoicing (completed) | PLAN-invoicing + Task Record; T1 schema, T2 engine + 13 tests, T3 /clients + /invoices UI, T4 hardening (float-display fix); 30/30 green; commits `b2f9e1f` + `1e3361f`; user acceptance |
| 2026-09-17 | Assistant (pk:plan→tasks→build→commit→checkpoint) | Milestone 3 Bank CSV Import (completed) | PLAN-csv-import + Task Record; M3.1 ImportBatch, M3.2 csvImport.ts + 14 tests, M3.3 /imports UI, M3.4 hardening; 44/44 green; stale :3000 replaced (approved); commits `bcf62fa` + `539de27`; checkpoint/handoff `-01`; user acceptance |
| 2026-09-17 | Assistant (pk:plan→build→commit→checkpoint) | Milestone 4 Invoice PDF Receipts (completed) | PLAN-pdf-receipts (Minimal, L1); M4.1 receipt route + view, M4.2 print CSS + button + links, M4.3 hardening; 44/44 green, tsc/lint clean, build 10 routes; commit `9c36976`; running :3000 left on pre-M4 (restart needed) |

---

## 9. Session Spend Ledger

| Session | Turns | Measured in/out | Estimated payload | Note |
| :--- | :--- | :--- | :--- | :--- |
| 2026-09-17 (onboard→M1 ship) | ~14 turns | ~48k in / ~14k out (est.) | ~7.5k–16.7k tok/turn | OpenCode CLI · Full M1 build in 1 session (intake, spec, 7 tasks, 2 commits, checkpoint) |
| 2026-09-17 (M2+M3 ship + checkpoint) | ~30 turns | not measured (host gives no per-turn figures) | not measured | OpenCode CLI · M2 invoicing + M3 CSV import, 4 commits, checkpoint/handoff records |
| 2026-09-17 (M4 receipts ship + checkpoint) | ~12 turns | not measured (host gives no per-turn figures) | not measured | OpenCode CLI · M4 receipt route + print CSS + spec, 1 commit (`9c36976`) |

- **Running total**: ~56 turns (3 sessions) — measured figures unavailable; estimates only where recorded.
