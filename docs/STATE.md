# Project State & Living Execution Tracker

## 1. Executive Summary & Current Position
- **Project Name**: LedgerCraft
- **Current Milestone / Epic**: Milestones 1–6 shipped (2026-09-17) → Next: Stripe remainder TBD via `pk:plan`
- **Overall Status**: ACTIVE <!-- Options: ACTIVE | PAUSED | STABILIZING | RELEASE_CANDIDATE | COMPLETED (all milestones closed, release evidence archived, zero open blockers — recording stops here) -->
- **Target Release / Deadline**: none (local-only)
- **Current Working Branch**: main (`476437b`)
- **Last Updated**: 2026-09-17 (M6 shipped — multi-currency `EUR→USD` base, 62/62 green, user acceptance)

---

## 2. Milestone & Task Progress

### Milestone Roadmap
- [x] **Milestone 0**: Phase 0 Intake Baseline — MVP floor + Later ledger + invariants locked (2026-09-17)
- [x] **Milestone 1**: Core Ledger Engine (CoA + balanced journal + TB/P&L) — completed 2026-09-17 (`9a4f250` product, `6dc9529` docs)
- [x] **Milestone 2**: Clients + Invoicing (accrual, full-pay) — shipped 2026-09-17 (T1–T4 + user acceptance, `1e3361f`)
- [x] **Milestone 3**: Bank CSV Import (drafts + balanced post + dedup) — shipped 2026-09-17 (M3.1–M3.4 + user acceptance, `539de27`)
- [x] **Milestone 4**: Invoice PDF Receipts (read-only receipt + browser print CSS, zero deps) — shipped 2026-09-17 (M4.1–M4.3 + spec, `9c36976`)
- [x] **Milestone 5**: Auth / Multi-User Accountant Login (shared ledger gate) — shipped 2026-09-17 (M5.1 `cde43b5`, M5.2–M5.4 `df3b5de`, 53/53 green, user acceptance)
- [x] **Milestone 6**: Multi-Currency Foreign Invoices (Base USD) — shipped 2026-09-17 (M6.1 `476437b` + hardening, 62/62 green, user acceptance)

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
- [x] TASK-2026-09-17-auth-multi-user M5.1 Schema + seed + domain (p0) — done 2026-09-17 (User/Session + bcryptjs @3.0.3 + opaque token, `cde43b5`, 53/53 green)
- [x] TASK-2026-09-17-auth-multi-user M5.2 Actions + middleware gate (p0) — done 2026-09-17 (login/logout + middleware 307 + `/login` + `Proxy`, smoke 307/200)
- [x] TASK-2026-09-17-auth-multi-user M5.3 Wiring + regression (p1) — done 2026-09-17 (requireSession on all actions 20 sites, 53/53 green, build `ƒ` all protected)
- [x] TASK-2026-09-17-auth-multi-user M5.4 Hardening + verify (p2) — done 2026-09-17 (cookie `httpOnly`/`SameSite`/`Secure` + 20× `requireSession` + curl 7×307 3×200 receipt 307/200 + `.env.example` placeholder, 53/53 green)
- [x] Manual acceptance M5 (owner: user): login `owner@ledgercraft.local` → Sign out → gated 307 → bad pass `invalid_credentials` — accepted 2026-09-17
- [x] TASK-2026-09-17-multi-currency M6.1 Schema + money (p0) — done 2026-09-17 (`Currency` + `convertCents` + backfill, 62/62 green)
- [x] TASK-2026-09-17-multi-currency M6.2 Engine + tests (p0) — done 2026-09-17 (FX-aware postInvoice EUR 10800 + journal base, USD 10000, 62/62 green)
- [x] TASK-2026-09-17-multi-currency M6.3 UI + receipt (p1) — done 2026-09-17 (form `EUR`+`1.08`→`USD 230.00`, list `EUR 200.00 → USD 230.00`, receipt dual, `476437b`)
- [x] TASK-2026-09-17-multi-currency M6.4 Hardening + verify (p2) — done 2026-09-17 (no float, `convertCents` integer, 20× `requireSession`, `USD 100→100` `EUR 100×1.08→108` TB balanced, `tsc`/`lint`/`build` Proxy)
- [x] Manual acceptance M6 (owner: user): `EUR 100×1.08→108` + `USD 100→100`, list dual, receipt dual, TB balanced — accepted 2026-09-17

---

## 3. Active Working Set
- **Target Workspace / Package (if Monorepo)**: standalone (N/A)
- **Active RFC / Spec**: none (M6 spec sealed: `docs/specs/2026-09-17-spec-multi-currency.md`)
- **Active Task Spec**: none (M6 Task Record completed at `476437b`; TDD `disabled`)
- **Key Source Files in Flight**: none (all landed at `476437b`)
- **Verification Commands (Scoped)**:
  - Unit Tests: `bun test` (62 pass / 0 fail 2026-09-17)
  - Typecheck: `bunx tsc --noEmit` (green 2026-09-17)
  - Linter: `bun run lint` (green 2026-09-17)
  - Build: `bun run build` (OK 2026-09-17, 11 routes + `ƒ Proxy (Middleware)`, all protected `ƒ`)

---

## 3A. Execution-Control Projection (Optional)

> This section is a synchronized projection for checkpoint continuity when the host project uses Controlled Work. The canonical authority remains `docs/tasks/<task-id>.md`; disagreement with that record is a validation failure and leaves execution blocked or `checkpoint_due` until reconciled.

- **Local Task Source**: `docs/tasks/TASK-2026-09-17-multi-currency.md`
- **Task ID**: `TASK-2026-09-17-multi-currency`
- **Task Record**: `docs/tasks/TASK-2026-09-17-multi-currency.md`
- **Specification**: `docs/specs/2026-09-17-spec-multi-currency.md`
- **Execution Scope**: `Repository standalone (single Next.js app + local SQLite)`
- **Execution State**: `completed`
- **Mapped `pk:tasks` Status**: `Done`
- **Active Task Pointer**: `None`
- **Owner / Current Actor**: `user (solo freelancer, M6 approver) / Assistant (M6 shipped)`
- **Start Time**: `2026-09-17 UTC`
- **Current Branch**: `main`
- **Current Revision**: `476437b`
- **Checkpoint Policy**: `Soft ~60m, hard ≤90m; event-driven on milestone/task/scope/handoff/compaction`
- **Blockers and Resume Condition**: `None — M6 shipped, user accepted 2026-09-17`
- **Verification Status**: `bun test 62/62 + tsc clean + lint clean + build 11 routes Proxy 2026-09-17; curl EUR 200→230 USD 100→100 TB balanced + gate 307/200`
- **CI Evidence**: `N/A`
- **Changed-File Summary**: `M6 shipped: Currency + convertCents + FX-aware postInvoice + form/list/receipt dual (62/62)`
- **Latest Checkpoint**: `None`
- **Latest Handoff**: `None`
- **Next Action**: `None — M6 complete; Later ledger remains: Stripe`

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
  - Later ledger remainder is Stripe (remaining) — needs `pk:plan` for Milestone 7.
  - Remote/GitHub setup open (no remote; `pk:pr` blocked until remote added — `tracking: github` in `PROMPTKIT.md` but local record is authoritative).
- **Technical Debt & Risks**:
  - Pre-existing init dirt untracked (`.clinerules/`, `.github/`, `.gitmodules`, `.opencode/`, `.promptkit/`, `AGENTS.md`) — surfaced, never staged; decide keep/commit separately.
  - Generated Prisma client (`src/generated/`) gitignored — fresh clones must run `bunx prisma generate`.
  - INV-04 evolution in M5: "no auth, local single-owner" → "auth wall, shared ledger (2 users), still local SQLite"; row-level tenant isolation deferred — track as risk if accountant read-only is needed (see `ASSUMPTION-auth-multi-user-002`).
  - INV-02 guard for M6: FX must stay integer `convertCents` — no float; see `DECISION-multi-currency-001`.
- **Later ledger (deferred, not backlog)**: Stripe webhooks (remaining). Shipped out of it: invoicing + clients (M2), bank CSV imports (M3), PDF receipts via browser print (M4), auth/multi-user (M5), multi-currency (M6).

---

## 6. Recent Architectural Decisions (ADR Log)
| Date | Title & Scope | Decision Summary | ADR File |
| :--- | :--- | :--- | :--- |
| not tracked | not tracked | not tracked | not tracked |

---

## 7. Next Immediate Actions (Queued)
1. Define Stripe scope (`pk:plan` — remaining Later ledger).
2. Optional: add git remote + `pk:pr` for review; decide fate of untracked init dirt.
3. `bun dev` daily driver (`:3000`): login at `/login`, then journal at `/journal`, invoices at `/invoices` (+ receipts with EUR→USD dual), imports at `/imports`, reports at `/trial-balance` + `/profit-loss` — all behind auth wall.

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
| 2026-09-17 | Assistant (pk:plan→tasks→build→commit) | Milestone 5 Auth / Multi-User (completed) | PLAN-auth-multi-user (Full) + Task Record; M5.1 User/Session + bcryptjs + 9 tests, M5.2 login/logout + Proxy 307 + /login, M5.3 requireSession 20 sites, M5.4 hardening curl 7×307 3×200; 53/53 green, tsc/lint/build green; commits `cde43b5` + `df3b5de`; user acceptance |
| 2026-09-17 | Assistant (pk:plan→tasks→build→commit) | Milestone 6 Multi-Currency (completed) | PLAN-multi-currency (Full) + Task Record; M6.1 Currency + convertCents + backfill, M6.2 FX post EUR 10800 + USD 10000, M6.3 form EUR→USD + list/receipt dual, M6.4 no-float + TB balanced; 62/62 green, tsc/lint/build Proxy green; commit `476437b`; user acceptance |

---

## 9. Session Spend Ledger

| Session | Turns | Measured in/out | Estimated payload | Note |
| :--- | :--- | :--- | :--- | :--- |
| 2026-09-17 (onboard→M1 ship) | ~14 turns | ~48k in / ~14k out (est.) | ~7.5k–16.7k tok/turn | OpenCode CLI · Full M1 build in 1 session (intake, spec, 7 tasks, 2 commits, checkpoint) |
| 2026-09-17 (M2+M3 ship + checkpoint) | ~30 turns | not measured (host gives no per-turn figures) | not measured | OpenCode CLI · M2 invoicing + M3 CSV import, 4 commits, checkpoint/handoff records |
| 2026-09-17 (M4 receipts ship + checkpoint) | ~12 turns | not measured (host gives no per-turn figures) | not measured | OpenCode CLI · M4 receipt route + print CSS + spec, 1 commit (`9c36976`) |

- **Running total**: ~56 turns (3 sessions) — measured figures unavailable; estimates only where recorded.
