# Project State & Living Execution Tracker

## 1. Executive Summary & Current Position
- **Project Name**: LedgerCraft
- **Current Milestone / Epic**: Milestones 1–7 shipped (2026-09-17); Vercel build repaired (2026-09-18) and the ledger moved onto a hosted libSQL database (Turso), now committed; PromptKit OS engine rebaselined as a pinned submodule with the generated agent config committed (2026-09-22) → Next: Turso token rotation / polish / release TBD
- **Overall Status**: ACTIVE <!-- Options: ACTIVE | PAUSED | STABILIZING | RELEASE_CANDIDATE | COMPLETED (all milestones closed, release evidence archived, zero open blockers — recording stops here) -->
- **Target Release / Deadline**: none (local → hosted; M7 live with Stripe test keys; ledger writes are now durable on Turso)
- **Current Working Branch**: main (`bb54381`)
- **Last Updated**: 2026-09-22 (PromptKit OS tooling baseline — engine fast-forwarded 60 commits to `e539627` and registered as a pinned submodule, generated agent directives + `.github` templates committed, tracker declared `tracking: local` + `projection: github`, the 2026-09-17 closeout records archived and their stale file inventories corrected. No application code touched and no test suite run, so this entry claims no green gate)

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
- [x] **Milestone 7**: Stripe Checkout + Webhook (Base USD, Hosted) — shipped 2026-09-17 (M7.1 `d1a1a92` + friendly `Stripe not configured`, `62/62`, user “it works”)

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
- [x] TASK-2026-09-17-stripe M7.1 Schema + Stripe client (p0) — done 2026-09-17 (`Invoice.stripe*` + `StripeEvent` + `d1a1a92`, friendly `Stripe not configured`)
- [x] TASK-2026-09-17-stripe M7.2 Checkout action + webhook (p0) — done 2026-09-17 (`createCheckout` + `POST /api/stripe/webhook` `p-stripe-<evt>` + `200/400`)
- [x] TASK-2026-09-17-stripe M7.3 Button + wiring (p1) — done 2026-09-17 (`StripePayButton` on `UNPAID` receipt + `Stripe` badge, `d1a1a92`)
- [x] TASK-2026-09-17-stripe M7.4 Hardening + verify (p2) — done 2026-09-17 (`Pay with Stripe` works — user `it works`, `62/62`, `POST /api/stripe/webhook` `ƒ`)

---

## 3. Active Working Set
- **Target Workspace / Package (if Monorepo)**: standalone (N/A)
- **Active RFC / Spec**: `docs/specs/2026-09-18-spec-hosted-libsql.md` (`PLAN-hosted-libsql`, L2)
- **Active Task Spec**: `docs/tasks/TASK-2026-09-18-hosted-libsql.md` — all five ACs pass; committed `56c1cd4`; §5 records the local-isolation follow-up (uncommitted)
- **Key Source Files in Flight**: local-isolation follow-up (uncommitted) — `.env.example`, `README.md`, `docs/tasks/TASK-2026-09-18-hosted-libsql.md`, `docs/STATE.md`, plus the gitignored `.env.development.local` + `.env.test.local` (never committed). Landed earlier — `src/lib/datasource.ts` (+ `src/lib/datasource.test.ts`), `src/lib/db.ts` in `666636a`; `eslint.config.mjs` in `9724b09`
- **Verification Commands (Scoped)**:
  - Unit Tests: `bun test` (75 pass / 0 fail 2026-09-18)
  - Typecheck: `bunx tsc --noEmit` (green 2026-09-18)
  - Linter: `bun run lint` (green 2026-09-18 — agent worktrees added to `globalIgnores`)
  - Build: `bun run build` (OK 2026-09-18 — `prisma generate && next build`, 13 routes incl. `ƒ /api/stripe/webhook` + `ƒ Proxy (Middleware)`, all protected `ƒ`)
  - Hosted smoke: `ledgercraft-ivory.vercel.app` `/` 307 → `/login` 200, `/login` 200; login POST 200 issuing `ledgercraft_session`, authed `/` `/journal` `/trial-balance` `/accounts` all 200 (2026-09-18)
  - Hosted persistence: session written by Production read back from the hosted DB by a separate process; a Preview-created session accepted by Production (2026-09-18)

---

## 3A. Execution-Control Projection (Optional)

> This section is a synchronized projection for checkpoint continuity when the host project uses Controlled Work. The canonical authority remains `docs/tasks/<task-id>.md`; disagreement with that record is a validation failure and leaves execution blocked or `checkpoint_due` until reconciled.

- **Local Task Source**: `docs/tasks/TASK-2026-09-18-hosted-libsql.md`
- **Task ID**: `TASK-2026-09-18-hosted-libsql`
- **Task Record**: `docs/tasks/TASK-2026-09-18-hosted-libsql.md`
- **Specification**: `docs/specs/2026-09-18-spec-hosted-libsql.md`
- **Execution Scope**: `Repository standalone (single Next.js app + local SQLite → hosted)`
- **Execution State**: `completed` (all ACs pass; committed `666636a` + `9724b09` + `56c1cd4`)
- **Mapped `pk:tasks` Status**: `Done`
- **Active Task Pointer**: `None (hosted-libSQL committed 56c1cd4)`
- **Owner / Current Actor**: `user (solo freelancer, migration approver) / Assistant (migration executed + verified)`
- **Start Time**: `2026-09-18 UTC`
- **Current Branch**: `main`
- **Current Revision**: `56c1cd4`
- **Checkpoint Policy**: `Soft ~60m, hard ≤90m; event-driven on milestone/task/scope/handoff/compaction`
- **Blockers and Resume Condition**: `None — hosted DB live, local dev/test isolated on file:./ledger.db, committed work at 398b24e. Resume with: commit the isolation follow-up (env overrides + .env.example + README + these docs), rotate the Turso tokens, drop the unused Vercel Development DATABASE_URL`
- **Verification Status**: `bun test 75/75 + tsc clean + lint clean + build 13 routes (2026-09-18); hosted login write persisted and cross-environment read proven; local isolation re-proven 2026-09-18 — bun dev accepted a local-only session across five routes and a signed Stripe webhook write landed in file:./ledger.db with 0 rows in the hosted DB`
- **CI Evidence**: `N/A`
- **Changed-File Summary**: `Hosted libSQL committed: 666636a (src/lib/datasource.ts +tests, src/lib/db.ts, .env.example), 9724b09 (eslint.config.mjs), 56c1cd4 + 398b24e (spec + task record + STATE); Turso ledgercraft seeded 15 accounts / 2 users. Local isolation follow-up uncommitted: .env.example, README.md, docs/tasks/… §5, docs/STATE.md + gitignored .env.development.local / .env.test.local. ledger.db drift resolved 2026-09-18 — untracked (git rm --cached; that commit was pruned as empty by the history rewrite), file kept on disk, `*.db` ignored, blob purged from main and force-pushed`
- **Latest Checkpoint**: `pk:checkpoint recorded 2026-09-18 (Vercel repair)`
- **Latest Handoff**: `docs/tasks/TASK-2026-09-17-core-ledger.handoff-01.md` + csv-import handoff (2026-09-17)`
- **Next Action**: `Commit the local-isolation follow-up (env overrides + .env.example + README + docs), then rotate the Turso tokens`

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
  - All Later ledger shipped (M2 invoicing, M3 CSV, M4 PDF, M5 auth, M6 multi-currency, M7 Stripe) — polish / release TBD.
  - Remote now present: `origin` → `github.com:lowqualityloey/ledgercraft` (2026-09-18), so `pk:pr` is unblocked. Tracker — **resolved 2026-09-22** (`2e12128`): `PROMPTKIT.md` declares `tracking: local` + `projection: github`, so the `docs/tasks/` Task Record stays authoritative and GitHub Issues mirror it via the authenticated `gh` CLI. The earlier bare `tracking: github` and a line-64-vs-line-118 disagreement inside `PROMPTKIT.md` are both gone.
- **Technical Debt & Risks**:
  - Pre-existing init dirt — **resolved 2026-09-22**: nothing in that set is untracked any more. `.promptkit/` + `.gitmodules` are a pinned git submodule (gitlink `e539627`, engine `v1.8.0-92-ge539627`) per `0214df8`; `.clinerules/`, `.github/`, `.opencode/`, `AGENTS.md` and `GEMINI.md` were committed in `e4f198c`. Consequence worth keeping: `.promptkit/workflows/` and `.promptkit/protocols/` are now versioned and authoritative — read them from disk each turn instead of recalling an earlier session, and move the pin deliberately with `git submodule update --remote --merge .promptkit`.
  - Generated Prisma client (`src/generated/`) gitignored — **resolved 2026-09-18**: build script runs `prisma generate && next build` (`0bbb0f2`), so fresh clones and CI both generate it; `bunx prisma generate` remains the standalone fallback.
  - Vercel build once failed (`Module not found: '@/generated/prisma/client'`) because `next build` ran without codegen — fixed `0bbb0f2`; do not drop `prisma generate` from the build script.
  - INV-04 evolution in M5: "no auth, local single-owner" → "auth wall, shared ledger (2 users), still local SQLite"; row-level tenant isolation deferred — track as risk if accountant read-only is needed (see `ASSUMPTION-auth-multi-user-002`).
  - INV-02 guard for M6: FX must stay integer `convertCents` — no float; see `DECISION-multi-currency-001`.
  - Hosted risk for M7 — **resolved 2026-09-18**: production previously ran `DATABASE_URL=file:/tmp/ledger.db` copied from the tracked `ledger.db`, so writes landed on a **per-instance `/tmp`** and did not survive cold starts. The ledger now runs on hosted libSQL (Turso `ledgercraft`, org `lowqualityloey`, ap-northeast-1): six migrations applied + seeded (15 accounts / 2 users), `DATABASE_URL` + `DATABASE_AUTH_TOKEN` set for Production and Preview, a Production login session read back from a separate process, and a Preview-created session accepted by Production — one shared durable database.
  - Vercel env scoping — **superseded 2026-09-18**: Production and Preview now hold the hosted `libsql://` `DATABASE_URL` + `DATABASE_AUTH_TOKEN`; **Development** still carries the earlier `file:/tmp/ledger.db` entry from the build fix — decide keep or remove. Note `AUTH_SECRET` is referenced **nowhere** in `src/` (0 matches), so the database pair is all that is needed.
  - `.env` (local) — **resolved 2026-09-18**: it once pointed development at the hosted database, so `bun dev` wrote to the same Turso database as Production/Preview. Fixed with no code change: the committed, secret-free mode files `.env.development` (`bun dev` / `next dev`) and `.env.test` (`bun test`) both set `DATABASE_URL="file:./ledger.db"`, with the gitignored per-machine `.env.development.local` / `.env.test.local` layered above them. Next.js and Bun agree on the order (`.env` → `.env.<mode>` → `.env.local` → `.env.<mode>.local`), so neither a `vercel env pull` rewriting `.env.local` nor a `libsql://` URL sitting in `.env` can re-point development at production — and because the mode files are tracked (`.gitignore` negates them), the guard travels with a fresh clone. Verified: a session that exists only in `file:./ledger.db` authenticated 200 on five routes, and a signed Stripe webhook write landed locally with 0 rows in the hosted DB. Clone-level guard verified 2026-09-18 in a clean shell with `.env` poisoned to `libsql://poison.invalid`: `bun dev` returned 200 on `/`, `/journal`, `/accounts` and `/trial-balance` for a session minted only into the local file DB, and `bun test` stayed 75/0 — while poisoning `.env.test.local` failed 3 auth tests and poisoning `.env.local` made `/journal` 500 with `getaddrinfo ENOTFOUND`, confirming both that the per-machine override layer still wins and that the poison target was genuinely unreachable.
  - `ledger.db` tracked-binary drift — **resolved 2026-09-18**: the file was force-committed only so the retired `/tmp` copy in `src/lib/db.ts` had a source object; that code is gone, so `git rm --cached ledger.db` untracked it (file kept on disk, now covered by `.gitignore:46` `*.db`). A fresh clone therefore needs `DATABASE_URL="file:./ledger.db" bunx prisma migrate deploy` before seeding — documented in `README.md`. The blob was then purged from history — see the rewrite entry below.
  - History rewrite — **2026-09-18**: `git filter-repo --path ledger.db --invert-paths` ran in a throwaway `--no-local` mirror clone (the working repo was never touched) and `main` was force-pushed with `--force-with-lease` (`20f9ecc` → `398b24e`). Verified: a fresh clone of the remote holds **0** `ledger.db` objects, and for every rewritten commit the tree equals the original minus exactly that one path (31 commits checked, 0 unexpected differences). Hashing is content-addressed, so history up to `d83073c` — and therefore tag `v0.7.0`, `refs/pull/1/head` and `refs/heads/base-m4` — is unchanged. Changed SHAs: `ca8d043→6f89f42`, `16b22d5→0bbb0f2`, `dc8c785→666636a`, `edeed56→9724b09`, `6921d92→56c1cd4`, `20f9ecc→6f66089`, `15e9f75→398b24e` (plus `937a3a5→9a0ce7c`, which exists only inside the mirror clone — the local `review/m7` branch was deliberately left at its old SHA); the untracking commit `9de229d` was pruned as empty, so the rewritten history simply never contains the file. Follow-up purge (same day): the debris refs were re-pointed to their blob-free rewritten equivalents (`review/m7` `937a3a5→9a0ce7c`; three `refs/cline/checkpoints/*`), the stale `origin/review/m7` remote-tracking ref was pruned, the `.kilo` worktree was moved off the old history and then removed, reflogs were expired and `git gc --prune=now` ran — after which `git cat-file -t <blob>` fails, `rev-list --all` shows no `ledger.db`, `.git` shrank 5.8M → 3.4M, and `fsck` reports 0 problems. The pre-rewrite bundle was then deleted, so no local copy of the old history remains outside GitHub's own unreachable objects.
  - Local runs writing to production — **new 2026-09-18**: `bun test` loads `.env` and `src/lib/auth.test.ts` drives the real Prisma client, so before the override files existed every test run created and deleted `User`/`Session` fixtures **in the hosted database**. Separately, an **exported** `DATABASE_URL` in the shell outranks every `.env*` file — a stale `set -a; . ./.env` export sent a verification probe to the wrong database. `unset DATABASE_URL DATABASE_AUTH_TOKEN` before trusting any environment probe.
  - Prisma migrate CLI — **new 2026-09-18**: cannot reach `libsql://` (`P1013: The scheme is not recognized in database URL`), so schema changes must go through `@libsql/client` (or a libsql-aware migrator); `prisma migrate dev/deploy` will not work against the hosted URL.
  - Turso tokens — **new 2026-09-18**: the *platform* (control-plane) token was initially placed in `DATABASE_AUTH_TOKEN`, which the libSQL endpoint rejects with HTTP 401; a database-scoped token was minted from it and wired in. The platform token is preserved commented in `.env` and, having passed through chat, should be rotated in the dashboard.
- **Later ledger (deferred, not backlog)**: none — all shipped: invoicing (M2), CSV (M3), PDF (M4), auth (M5), multi-currency (M6), Stripe (M7).

---

## 6. Recent Architectural Decisions (ADR Log)
| Date | Title & Scope | Decision Summary | ADR File |
| :--- | :--- | :--- | :--- |
| not tracked | not tracked | not tracked | not tracked |

---

## 7. Next Immediate Actions (Queued)
1. ~~Commit the hosted-libSQL work (`pk:commit`)~~ — **done 2026-09-18**: `666636a` resolver + tests + `src/lib/db.ts` + `.env.example`, `9724b09` eslint agent worktrees, `56c1cd4` spec + task record + STATE; credentials never staged (`.env*` is gitignored).
2. Rotate the Turso tokens: the platform token passed through chat and the database token was minted from it; mint a fresh database token and update Vercel + `.env`.
3. ~~Decide the local `.env` target~~ — **done 2026-09-18**: dev/test pinned to `file:./ledger.db` by `.env.development.local` + `.env.test.local`; the `ca8d043`-era `/tmp` guidance in README is gone.
4. ~~Decide the `ledger.db` drift~~ — **done 2026-09-18**: untracked (`git rm --cached`) and the blob purged from `main` via a history rewrite + force-push.
5. Optional: `pk:pr` — remote `origin` is configured. The init dirt is committed as of 2026-09-22 (`0214df8` engine pin, `e4f198c` host directives + templates), so only the local-isolation docs (`.env.example`, `README.md`, `docs/STATE.md`, task-record §5) remain before opening a PR.
6. `bun dev` daily driver (`:3000`): login at `/login`, then journal at `/journal`, invoices at `/invoices` (+ receipts with EUR→USD, `Pay with Stripe` when UNPAID), imports at `/imports`, reports at `/trial-balance` + `/profit-loss` — all behind auth wall (hosted webhook at `/api/stripe/webhook`).
7. Polish / release: Stripe live keys cutover, FX revaluation, or CSV multi-currency — via `pk:plan`.

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
| 2026-09-17 | Assistant (pk:plan→tasks→build→commit) | Milestone 7 Stripe Checkout + Webhook (completed) | PLAN-stripe (Full) + Task Record; M7.1 Invoice.stripe* + StripeEvent + stripe@19.1.0, M7.2 createCheckout + POST /api/stripe/webhook p-stripe-<evt>, M7.3 Pay with Stripe on UNPAID + Stripe badge, M7.4 friendly Stripe not configured + works; 62/62 green, tsc/lint/build 12 routes; commit `d1a1a92`; user “it works” |
| 2026-09-18 | Assistant (pk:debug→fix→commit→checkpoint) | Vercel deployment repair (L2 inspected → L1 commit) | Root-caused prod/preview build failures: `Module not found: '@/generated/prisma/client'` — Prisma 7 `prisma-client` generator writes `src/generated/prisma` (gitignored) and `next build` never regenerated it; build script now `prisma generate && next build`; verified clean local build, Vercel preview + production Ready, login POST issues session cookie, all 8 authed routes 200, 62/62 + tsc/build green; commit `0bbb0f2` |
| 2026-09-18 | Assistant (pk:plan→db→ship) | Hosted libSQL migration (Turso) | Turso `ledgercraft` created by the user; diagnosed that the supplied token was a control-plane token (claims `jti`/`org_id` → HTTP 401) and minted a database-scoped token from it; six migrations applied via `@libsql/client` (Prisma CLI cannot reach `libsql://` — P1013) + seed 15 accounts / 2 users; `DATABASE_URL` + `DATABASE_AUTH_TOKEN` set for Production + Preview; added `TURSO_DATABASE_URL` aliasing to the resolver; login POST on Production and Preview both issue sessions, read back from the hosted DB and cross-accepted between environments; `eslint` `globalIgnores` gained `.kilo/**`; 75/75 green, lint/build clean |
| 2026-09-18 | Assistant (isolation + git hygiene) | Local dev/test isolation + `ledger.db` blob purge | `.env.development.local` + `.env.test.local` pin `bun dev`/`bun test` to `file:./ledger.db` (local-only session 200s on five routes; signed webhook write landed locally with 0 rows hosted); found `bun test` had been writing auth fixtures to the hosted DB; `git rm --cached ledger.db` untracked the local DB; `git filter-repo` in a mirror clone + `main` force-pushed `20f9ecc`→`398b24e`, remote verified blob-free; 26 doc SHA references remapped |
| 2026-09-22 | Assistant (pk:sync→commit) | PromptKit OS tooling baseline (no application code) | Checked out `.promptkit` — the engine sat at `423d492` (60 commits behind); pulled `origin/main` to `e539627` (`v1.8.0-92`) and re-ran `init.sh` (profile `balanced`, hosts `opencode,gemini,cline` all preserved; 4 host directive blocks refreshed); then made the pin real rather than ambient: `0214df8` registered `.promptkit` + `.gitmodules` as a gitlink and `absorbgitdirs` moved the embedded repo to `.git/modules/.promptkit`, so `git submodule update --remote --merge .promptkit` now exits 0 (it previously failed with `pathspec '.promptkit' did not match any file(s) known to git`); `e4f198c` committed the 4 identical host directive copies + `.github` PR/issue templates, deliberately excluding the 21 MB `.opencode/node_modules` tree that `.opencode/.gitignore` self-excludes; `2e12128` resolved a tracker disagreement where line 64 said `tracking: local` while line 118 said `github`, settling on `local` + `projection: github` and verified idempotent by re-running `init.sh` (all 5 files byte-identical after); `cf271cf` archived the 2026-09-17 checkpoint/handoff records, which were untracked and therefore had no history to recover from; `bb54381` added dated `§7 Post-Closeout Corrections` to both handoffs instead of rewriting their point-in-time snapshots, since both still described `.promptkit/` and `AGENTS.md` as untracked init dirt |

---

## 9. Session Spend Ledger

| Session | Turns | Measured in/out | Estimated payload | Note |
| :--- | :--- | :--- | :--- | :--- |
| 2026-09-17 (onboard→M1 ship) | ~14 turns | ~48k in / ~14k out (est.) | ~7.5k–16.7k tok/turn | OpenCode CLI · Full M1 build in 1 session (intake, spec, 7 tasks, 2 commits, checkpoint) |
| 2026-09-17 (M2+M3 ship + checkpoint) | ~30 turns | not measured (host gives no per-turn figures) | not measured | OpenCode CLI · M2 invoicing + M3 CSV import, 4 commits, checkpoint/handoff records |
| 2026-09-17 (M4 receipts ship + checkpoint) | ~12 turns | not measured (host gives no per-turn figures) | not measured | OpenCode CLI · M4 receipt route + print CSS + spec, 1 commit (`9c36976`) |
| 2026-09-18 (Vercel repair + commit + checkpoint) | ~8 turns | host telemetry unavailable | ~80k tok total (~8k–15k tok/turn) | Vercel CLI + Vercel-hosted build/log inspection, 1 commit (`0bbb0f2`); host exposes no per-turn metering |

| 2026-09-18 (hosted libSQL migration) | ~40 turns | host telemetry unavailable | not measured | Turso provisioning + credential diagnostics (401 root cause = platform token), migrations applied via `@libsql/client`, Vercel env for Production/Preview, two deploys, persistence proofs; host exposes no per-turn metering |
| 2026-09-22 (PromptKit tooling baseline) | ~10 turns | host telemetry unavailable | not measured | Submodule update + `init.sh` refresh + 5 hygiene commits (`0214df8`, `e4f198c`, `2e12128`, `cf271cf`, `bb54381`); no application code touched and no test suite run, so no green-gate claim is made for this session |

- **Running total**: 6 sessions logged — measured figures unavailable; estimates only where the host exposed them.
