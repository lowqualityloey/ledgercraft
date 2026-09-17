# Task Record: Milestone 8 — Hosted libSQL Persistence (Durable Ledger)

<a id="TASK-2026-09-18-hosted-libsql"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-18-hosted-libsql`
- **PromptKit Adaptation Profile**: `none` (legacy dated ID preserved)
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
  - Note: `.env` currently points local development at the hosted database (per the user's request to wire it there), so `bun dev` writes to the same Turso database as Production/Preview; the `file:./ledger.db` line is kept commented for switching back.`

## 4. Execution Policy

- **TDD Mode**: `enabled` for `resolveDatasource` (pure function, unit-tested); smoke probes for hosted integration
- **Checkpoint Policy**: `Soft ~60m, hard ≤90m; event-driven on scope/deploy/handoff` (L2 hard stop)
- **Commit Policy**: stage only the resolver, its tests, `src/lib/db.ts`, `.env.example`, and these two records; credentials are never staged
- **Commit Evidence**: `2026-09-18 (three atomic commits, staged-index secret scan clean) — dc8c785 feat(db): resolve libSQL datasource from env for hosted databases; edeed56 chore(lint): ignore local agent worktrees in eslint; 6921d92 docs(plan): record hosted libsql migration (spec + task + STATE)`. Staged-only, explicit paths, no `.env`/credentials in any commit; `.env.example` carries placeholders only.
- **Deploy Policy**: remote schema bootstrap → env update → code deploy, in that order; a deploy before the remote schema exists is a rollout failure
