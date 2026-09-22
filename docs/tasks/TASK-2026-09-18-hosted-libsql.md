# Task Record: Milestone 8 — Hosted libSQL Persistence (Durable Ledger)

<a id="TASK-2026-09-18-hosted-libsql"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-18-hosted-libsql`
- **PromptKit Adaptation Profile**: `none`
- **Work Type**: `Code Work`
- **Planning Record Link**: `[PLAN-hosted-libsql](../specs/2026-09-18-spec-hosted-libsql.md#PLAN-hosted-libsql)`
- **Planning Depth Reference**: `Full`
- **Assumption Record Links**: `[ASSUMPTION-hosted-libsql-001, ASSUMPTION-hosted-libsql-002, ASSUMPTION-hosted-libsql-003](../specs/2026-09-18-spec-hosted-libsql.md#PLAN-hosted-libsql)` (all accepted, owner: user)
- **Specification**: `docs/specs/2026-09-18-spec-hosted-libsql.md`
- **External Reference (Optional)**: `N/A` (Turso setup link supplied in-session by the service index)
- **Owner / Actor**: `user (solo freelancer, account owner) / Assistant (implementation)`
- **Execution Scope**: `Repository standalone (single Next.js app; local SQLite file → hosted Turso libSQL)`
- **Approval Boundary**: `Commits need explicit approval; credentials are user-supplied and never committed; scope expansion needs Scope Change Record`
- **Created**: `2026-09-18 UTC`

> This Local Task Source is authoritative for Controlled Work. Planning/Assumption links are context only.

## 2. Objective and Boundaries

- **Objective**: Move Production and Preview off the ephemeral per-instance `/tmp` SQLite file onto a remote libSQL database authenticated by a token, so ledger writes (journal entries, invoices, sessions) persist across serverless cold starts, while local development keeps its own file database.
- **In Scope**:
  - `src/lib/datasource.ts` — new pure `resolveDatasource(env)` returning `{url, authToken?}`, classifying `file:` as local and `libsql://`/`https://`/`wss://` as remote
  - `src/lib/datasource.test.ts` — unit coverage for the resolver branches
  - `src/lib/db.ts` — construct `PrismaLibSql` from the resolver; delete the `node:fs` `./ledger.db` → `/tmp/ledger.db` copy workaround
  - `.env.example` — document `DATABASE_AUTH_TOKEN` / `TURSO_AUTH_TOKEN` and the `libsql://` form, including the `TURSO_DATABASE_URL` URL alias
  - Vercel env: `DATABASE_URL` (`libsql://…`) + `DATABASE_AUTH_TOKEN` for Production and Preview (local Development scope returns to `file:./ledger.db`)
  - Remote schema bootstrap: six existing `prisma/migrations/*/migration.sql` applied, then `prisma/seed.ts` (15 accounts + 2 users)
- **Explicit Non-Goals**:
  - No schema/model or migration changes; no ORM change; no connection pooling, edge replicas or latency tuning
  - No auth/session model change; no row-level tenant isolation; no Stripe/webhook behavior change
  - Not migrating historical `/tmp` contents; not pointing local development at the hosted database
  - No credentials in the repository, logs, docs, or commit messages; no Turso API provisioning from the agent
- **Dependencies**: `@prisma/adapter-libsql@7.10.0` (+ bundled `@libsql/client`, `Config.authToken` confirmed) — already installed; user-created Turso database (URL + token)
- **Risk**: `High` — persistent-data + deployment-target change; mitigation: resolver fails closed on a remote URL without a token, schema bootstrap precedes the deploy, remote credentials scoped to Production/Preview only, and rollback is an env revert plus redeploy of the prior commit
- **Verification Condition**: `bun test && bunx tsc --noEmit && bun run build` green; remote DB shows 6 applied migrations + seeded 15 accounts / 2 users; a login POST creates a session that a **separate process** can read back from the remote URL; hosted `307`/`200` gate and 8 authed routes still `200`; local `bun dev` still bound to `file:./ledger.db`

## 3. Acceptance Criteria

- [x] **AC-1**: Resolver classifies datasource URLs and requires a token only for remote URLs
  - **Result**: `Pass`
  - **Evidence**: `2026-09-18 — bun test: 70 pass / 0 fail (8 new in src/lib/datasource.test.ts: default local, file: without token, stray token dropped, libsql:// + DATABASE_AUTH_TOKEN, TURSO_AUTH_TOKEN alias, precedence, remote-without-token throws, protocol classification incl. file:./http-cache.db staying local)`
  - **Evidence**: `2026-09-18 (Turso-documented aliases) — bun test: 75 pass / 0 fail (13 in src/lib/datasource.test.ts: adds TURSO_DATABASE_URL as a URL alias, DATABASE_URL winning over it, a blank DATABASE_URL not shadowing it, blank/missing URLs falling back to file:./ledger.db, and a local TURSO_DATABASE_URL staying tokenless); bunx tsc --noEmit exit 0; bunx eslint on the three changed source files exit 0; bun run build exit 0`
  - Gherkin: `Given DATABASE_URL unset, When resolveDatasource, Then url is file:./ledger.db and no authToken. Given a file: URL, When resolveDatasource, Then no authToken is attached. Given a libsql:// URL with DATABASE_AUTH_TOKEN, Then {url, authToken}. Given the same URL with TURSO_AUTH_TOKEN, Then the alias is used. Given a libsql:// URL in TURSO_DATABASE_URL with TURSO_AUTH_TOKEN, Then the alias pair is used. Given a blank DATABASE_URL and a set TURSO_DATABASE_URL, Then the alias is used. Given a libsql:// or https:// URL with no token, Then it throws with an actionable message.`

- [x] **AC-2**: Prisma client connects through the resolved datasource config
  - **Result**: `Pass`
  - **Evidence**: `2026-09-18 — src/lib/db.ts constructs PrismaLibSql(resolveDatasource()); bunx tsc --noEmit exit 0; bun run lint clean; bun run build exit 0; built app smoke on :3100 with file:./ledger.db — / 307→/login, /login 200, /trial-balance 307 with bogus cookie (DB query executed through the new resolver, no 500)`
  - Gherkin: `Given a remote URL and token, When the app imports src/lib/db.ts, Then the libSQL adapter is constructed with both url and authToken. Given a local file URL, Then no token is sent and no /tmp copy side effect occurs.`

- [x] **AC-3**: Hosted environments read and write a persistent remote database
  - **Result**: `Pass`
  - **Evidence**: `2026-09-18 — Production (ledgercraft-2wr1mrkke) login POST → HTTP 200 + Set-Cookie ledgercraft_session (64 hex, Secure/HttpOnly/SameSite=lax); authed / /journal /trial-balance /accounts all 200; the same token read back from the hosted database by a separate process on this machine → 1 row, owner@ledgercraft.local, expires 2026-09-24. Preview (ledgercraft-ypxban9i3) login POST also issued a 64-hex session, and that preview-created session authenticates against production (/ 200, /journal 200) — both environments share one hosted database. Test sessions deleted after verification (2 removed, 0 remaining).`
  - Gherkin: `Given remote DATABASE_URL + DATABASE_AUTH_TOKEN set for Production and Preview, When a user logs in, Then a Session row is written to the remote database and the response issues a ledgercraft_session cookie. Given that same session token, When read back from a separate process against the remote URL, Then the row is present — proving persistence across instances.`

- [x] **AC-4**: Remote schema matches the local schema
  - **Result**: `Pass`
  - **Evidence**: `2026-09-18 — the Prisma migrate CLI cannot reach libsql:// (P1013: "The scheme is not recognized in database URL"), so the six prisma/migrations/*/migration.sql files were applied in order through @libsql/client executeMultiple; 36 objects created (Account, Client, ImportBatch, Invoice, InvoiceLine, JournalEntry, JournalLine, Session, StripeEvent, User + indexes); bun run db:seed → 15 accounts, 2 users (owner + accountant); authed /trial-balance renders 200 with no "no such table" error.`
  - Gherkin: `Given a fresh empty remote database, When all six migration.sql files are applied in order and prisma/seed.ts runs, Then Account count is 15, User count is 2, and an authed trial-balance request renders without a "no such table" error.`

- [x] **AC-5**: No regression — auth wall, ledger invariants, and local development intact
  - **Result**: `Pass`
  - **Evidence**: `2026-09-18 — 75/75 suite (13 resolver tests incl. the TURSO_DATABASE_URL aliases) + bunx tsc --noEmit exit 0 + bun run lint exit 0 (agent worktrees now in globalIgnores) + bun run build exit 0 (13 routes). Hosted: unauthed / 307 → /login, /login 200, authed routes 200. Local development: the resolver still defaults to file:./ledger.db when no URL is set, and the file: URL is preserved (commented) in .env beside the hosted one. No credential appears in git, docs, or logs.`
  - Gherkin: `Given the new datasource code, When unauthed GET /, Then 307 to /login; When authed, Then 200 on all 8 protected routes. Given a file: DATABASE_URL (or none) and no token, When bun dev runs, Then it reads file:./ledger.db and the suite stays green. Given the hosted pairing, When the app writes, Then the row is visible to every other instance and environment. Given any env, Then no credential appears in git, docs, or logs.`
  - Note: `.env` pointed local development at the hosted database at commit time, so `bun dev`/`bun test` wrote to the same Turso database as Production/Preview. This was corrected immediately after — see §5.`

## 4. Execution Policy

- **TDD Mode**: `enabled` for `resolveDatasource` (pure function, unit-tested); smoke probes for hosted integration
- **Mode**: `Gated Mode`
- **Batch Authorization**: `N/A — one approved task, one execution scope`
- **Soft Checkpoint**: `Around 60 minutes`
- **Hard Checkpoint**: `At or before 90 minutes (L2 hard stop)`
- **Event-Driven Checkpoints**: `Milestone, task switch, scope expansion, deploy, handoff, compaction, or context drift`
- **Stop Conditions**: `Missing approval or credentials, failed verification (test, tsc, lint, build), failed invariant, blocker, hard checkpoint, or developer stop`
- **Host Timer Capability**: `No mechanical enforcement observed — the host cannot enforce a checkpoint or force termination, so live timing is a limitation: checkpoints are manual and the hard stop is by agreement`
- **Checkpoint Policy**: `Soft ~60m, hard ≤90m; event-driven on scope/deploy/handoff` (L2 hard stop)
- **Commit Policy**: stage only the resolver, its tests, `src/lib/db.ts`, `.env.example`, and these two records; credentials are never staged
- **Commit Evidence**: `2026-09-18 (three atomic commits, staged-index secret scan clean) — 666636a feat(db): resolve libSQL datasource from env for hosted databases; 9724b09 chore(lint): ignore local agent worktrees in eslint; 56c1cd4 docs(plan): record hosted libsql migration (spec + task + STATE)`. Staged-only, explicit paths, no `.env`/credentials in any commit; `.env.example` carries placeholders only.
- **Deploy Policy**: remote schema bootstrap → env update → code deploy, in that order; a deploy before the remote schema exists is a rollout failure

## 5. Post-Commit Follow-Up — Local Isolation Restored (2026-09-18)

This closes the deviation noted in AC-5: hosting `DATABASE_URL` in `.env` had silently pointed *local* runs at production, contradicting the planning record's explicit non-goal ("not pointing local development at the hosted database").

- **Change**: `.env` keeps the hosted libSQL URL + token (Vercel, ad-hoc remote ops). Two gitignored overrides pin local modes to the file database — `.env.development.local` (`bun dev`) and `.env.test.local` (`bun test`), each `DATABASE_URL="file:./ledger.db"`.
- **Why override files, not a code change**: Next.js loads `.env.<mode>.local` *after* `.env.local`, and Bun uses the same order (`.env` → `.env.<mode>` → `.env.local` → `.env.<mode>.local`), so a later `vercel env pull` rewriting `.env.local` cannot silently re-point development at production. No application code changed.
- **Evidence — read path**: a session minted through the app's own code path into `file:./ledger.db` (a token absent from the hosted DB) returned `200` on `/`, `/journal`, `/trial-balance`, `/accounts`, `/invoices` from `bun dev` on `:3100`, and `/journal` rendered the local-only entries (local 5 journal entries vs 0 remotely).
- **Evidence — write path**: a signed Stripe webhook (`probe.local_write`) POSTed to `bun dev` returned `200 {"received":true,"unhandled":"probe.local_write"}`; the `StripeEvent` row landed in `file:./ledger.db` (1 row) and **not** in the hosted database (0 rows, 0 total). Probe row deleted after verification.
- **Evidence — test path**: with a clean shell, `bun test` resolved `file:./ledger.db` instead of `libsql://…`; before this change the same probe resolved the hosted URL with a token, meaning `src/lib/auth.test.ts` (which drives the real Prisma client) had been creating and deleting `User`/`Session` fixtures **in production**.
- **Evidence — script path**: a plain `bun <file>` (the `bun db:seed` / `bun prisma/seed.ts` shape) now resolves `file:./ledger.db`; `NODE_ENV=production bun <file>` still resolves the hosted URL, so production-mode tooling is unaffected.
- **Docs**: `.env.example` + `README.md` now document the load order and both override files; the stale "`file:/tmp/ledger.db` on Vercel" guidance was removed.
- **Committed**: `b1ddc0f` — *"docs(env): record local dev/test isolation and post-rewrite SHAs"*, the last commit of this task. The docs previously credited this follow-up to `398b24e`, which is the earlier completion commit (`docs(state): mark the hosted libsql work committed`) that re-queued the isolation item rather than performing it.
- **Not verified here**: the hosted deployment was not redeployed or re-tested this turn (no code change), and the local-mode switch was not exercised through a browser.

## 6. State and Active Ownership

- **Execution State**: `completed`
- **Mapped `pk:tasks` Status**: `Done`
- **Active Task Pointer**: `None`
- **Start Time**: `2026-09-18 UTC`
- **Current Actor**: `user (solo freelancer, account owner) / Assistant (implementation)`
- **Next Action**: `None — Milestone 8 is complete: the hosted database is live and local dev/test stay on file:./ledger.db. Later work on the same database (credential rotation, a bounded 90-day expiry, and a CI expiry guard) is recorded in docs/STATE.md section 5 and section 9.`
- **Branch / Revision**: `main @ b1ddc0f` (§5 isolation follow-up; the preceding completion commit is `398b24e`)

> This record keeps its legacy dated ID, which is why the adaptation profile is `none`.

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
|---|---|---|---|---|---|
| N/A | planned | 2026-09-18 UTC | Assistant (pk:tasks) | Task Record created from PLAN-hosted-libsql | docs/specs/2026-09-18-spec-hosted-libsql.md#PLAN-hosted-libsql |
| planned | ready | 2026-09-18 UTC | Assistant (pk:tasks) | Readiness complete: objective, scope boundary, risk and verification condition recorded | docs/specs/2026-09-18-spec-hosted-libsql.md#PLAN-hosted-libsql |
| ready | in_progress | 2026-09-18 UTC | Assistant | Implementation began once the owner supplied the Turso database URL and token | src/lib/datasource.ts + src/lib/datasource.test.ts |
| in_progress | awaiting_review | 2026-09-18 UTC | Assistant | AC-1 to AC-5 evidenced, including hosted Production and Preview verification | bun test 75 pass / 0 fail; hosted login POST 200 with the session read back by a separate process |
| awaiting_review | completed | 2026-09-18 UTC | Assistant | Completion recorded with all five acceptance criteria at Pass; the AC-5 deviation closed by section 5 | Commits 666636a, 9724b09, 56c1cd4; section 5 evidence |

## 7. Evidence and Completion Gate

- **Changed Files**:
  - `src/lib/datasource.ts` — new `resolveDatasource(env)` with the local/remote classification (666636a)
  - `src/lib/datasource.test.ts` — 13 resolver tests: aliases, precedence, blank values, fail-closed throw, protocol classification (666636a)
  - `src/lib/db.ts` — `PrismaLibSql(resolveDatasource())`, removing the `/tmp` copy workaround (666636a)
  - `.env.example` — `DATABASE_AUTH_TOKEN` / `TURSO_AUTH_TOKEN` and the `libsql://` URL form (666636a)
  - `eslint.config.mjs` — local agent-worktree paths added to `globalIgnores` (9724b09, outside the recorded In Scope list)
  - `docs/specs/2026-09-18-spec-hosted-libsql.md`, `docs/tasks/TASK-2026-09-18-hosted-libsql.md`, `docs/STATE.md` — planning and state records (56c1cd4)
- **Scope Change Records**: `SCOPE-2026-09-18-hosted-libsql-01` (retroactive — created 2026-09-23 to record the two unplanned paths below)
- **Scope Deviation Note**: two changes fell outside the recorded In Scope list and carry no Scope Change Record — `eslint.config.mjs` (9724b09) and the three documentation files (56c1cd4). Both were incidental to the migration; they are recorded in `docs/tasks/SCOPE-2026-09-18-hosted-libsql-01.md` rather than left unmentioned.
- **Checkpoint Records**: `None for this task — the 2026-09-18 checkpoint on file belongs to TASK-2026-09-17-core-ledger`
- **Handoff Records**: `None`
- **Verification Evidence**: `2026-09-18 — resolver: bun test 70 pass / 0 fail (8 new tests), then 75 pass / 0 fail (13 resolver tests: default local, file: without token, stray token dropped, libsql:// with DATABASE_AUTH_TOKEN, TURSO_AUTH_TOKEN alias, precedence, remote-without-token throws, protocol classification including file:./http-cache.db staying local); bunx tsc --noEmit exit 0; bun run lint exit 0; bun run build exit 0 (13 routes). Hosted: six migrations applied through @libsql/client, seed 15 accounts / 2 users, Production and Preview login POST 200 with a 64-hex session cookie, that session read back from the hosted DB by a separate process and accepted by the other environment, unauthed / 307 to /login, /login 200, all 8 authed routes 200. Local: bun dev bound to file:./ledger.db, a local-only session accepted across five routes, and a signed Stripe webhook write landing locally with 0 hosted rows. Later re-run 2026-09-23 — bun test 82 pass / 0 fail (170 expect() calls, 8 files), tsc exit 0, eslint exit 0, build exit 0 in 45s with the hosted DB counts unchanged across the build.`
- **CI Evidence**: `None — this repository has no test workflow; verification is the local gate listed above. (The 2026-09-23 database-token expiry guard is a separate workflow and does not cover this task's code.)`
- **Review Evidence**: `Owner review of the three commits (666636a, 9724b09, 56c1cd4) together with the five AC results in section 3; no separate review artifact exists.`
- **Pull Request Evidence**: `None — no pull-request workflow; the three commits were pushed directly to main.`
- **Release Evidence**: `None — no tagged release; production deploys by pushing to main, where Vercel builds and aliases Production.`
- **Blocker and Resume Condition**: `None — the hosted database is live and local dev/test are isolated on file:./ledger.db. Historical resume items are closed: the isolation follow-up was committed (b1ddc0f), the credential rotation it referenced was completed 2026-09-23, and the Vercel Development DATABASE_URL was measured on 2026-09-23 and deliberately kept, because it holds file:./ledger.db and the warning that it was stale was wrong. Standing caveat: Vercel Preview sits behind deployment-protection SSO, so Preview reachability has to be checked through a protection bypass.`
- **Completion State**: `completed`
- **Acceptance Results**: `AC-1 Pass; AC-2 Pass; AC-3 Pass; AC-4 Pass; AC-5 Pass — with the AC-5 deviation (local runs pointed at the hosted database) closed by section 5 and the follow-up accepted by the owner.`
- **Changed-File Summary**: `Product: src/lib/datasource.ts, src/lib/datasource.test.ts, src/lib/db.ts, .env.example (666636a); eslint.config.mjs (9724b09). Docs: docs/specs/2026-09-18-spec-hosted-libsql.md, docs/tasks/TASK-2026-09-18-hosted-libsql.md, docs/STATE.md (56c1cd4 + 398b24e, plus b1ddc0f for the isolation follow-up). Outside the repository: Vercel DATABASE_URL + DATABASE_AUTH_TOKEN for Production and Preview; the hosted ledgercraft database carries the six migrations and the seeded 15 accounts / 2 users. b1ddc0f is the follow-up that pinned local dev and test to file:./ledger.db through .env.development.local and .env.test.local; the local database file stays untracked and *.db is ignored.`
- **Completion Exception**: `None — the AC-5 deviation was closed inside section 5 rather than carried as an exception.`
- **Completion Decision and Timestamp**: `Completed 2026-09-18 UTC by Assistant; all five acceptance criteria at Pass with the evidence in sections 3 and 5; product commits 666636a + 9724b09 + 56c1cd4, completion commit 398b24e, follow-up b1ddc0f.`
