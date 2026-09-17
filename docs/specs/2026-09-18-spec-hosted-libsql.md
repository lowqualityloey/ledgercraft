# Technical Design Document (RFC): Hosted libSQL Persistence — Durable Ledger on Vercel

- **Author**: Assistant (this session) + user (owner, asked for durable hosted writes)
- **Status**: Accepted (implemented in this session, verification pending remote credentials)
- **Created**: 2026-09-18
- **Target Release**: Post-M7 hardening (Milestone 8 candidate)

---

## Planning Record (PromptKit Adaptation)

<a id="PLAN-hosted-libsql"></a>

> Level 2 (Controlled) — persistent data + deployment-target change. Full depth required.

### Planning Record Metadata

- **Planning Record ID [Required]**: `PLAN-hosted-libsql`
- **Planning Depth [Required]**: `Full`
- **Owner [Required]**: user (solo freelancer; wants hosted ledger writes to survive cold starts)
- **Record Status [Required]**: `ready`
- **Local Task Record Link [Required for Controlled Work]**: `docs/tasks/TASK-2026-09-18-hosted-libsql.md#TASK-2026-09-18-hosted-libsql`
- **Workflow Links [Optional]**: `pk:plan` (this session) → build H1–H4

### Planning Inputs

- **Requested Outcome [Required]**: The hosted ledger stops living on an ephemeral per-instance file, so journal entries, invoices and sessions written on production or a preview deploy persist across serverless cold starts and instance rotation.
- **Observable Completion Condition [Required]**: (1) Production and Preview run against a remote `libsql://` database with an auth token; (2) a session/login written through one invocation is still readable from a separate client process (proving persistence, not instance-local memory); (3) `GET /` stays `307 → /login` and authed routes `200`; (4) `bun test`, `tsc`, `bun run build` green; (5) local `bun dev` still uses `file:./ledger.db` and never touches hosted data.
- **Scope Boundary [Required]**: In scope — `src/lib/datasource.ts` (new pure resolver), `src/lib/db.ts` (remote URL + `authToken`, remove the `/tmp` copy workaround), `.env.example`, Vercel `DATABASE_URL` + `DATABASE_AUTH_TOKEN` for Production + Preview, remote schema bootstrap of the six existing migrations + seed. Out of scope — schema/model changes, auth changes, read-replica/latency tuning, multi-tenant isolation, migrating the historical `/tmp` contents, Turso CLI installation, any UI change.
- **TDD Enforcement Proposal (Reference Only) [Optional]**: `enabled` for the pure resolver (`src/lib/datasource.test.ts`); integration behavior verified by smoke probes.

### Full Planning

- **Explicit Non-Goals [Required in Full; Not applicable in Minimal]**: Schema or migration changes; switching ORM; connection pooling/edge replicas; per-accountant row isolation; Stripe/webhook behavior changes; replacing the auth session model; provisioning Turso via API (account provisioning is user-driven); committing any credential; pointing local development at the hosted database.
- **Affected Behavioral Components [Required in Full; Not applicable in Minimal]**: (1) Datasource resolution — new `src/lib/datasource.ts` (`resolveDatasource(env)` → `{url, authToken?}`), consumed by (2) `src/lib/db.ts` (single `PrismaLibSql` construction site, `node:fs` copy workaround deleted); (3) Environment — `.env.example` documents the remote pair; Vercel env scoping for Production + Preview; (4) Remote database — six SQL migrations + `prisma/seed.ts` applied to Turso; (5) Deploy sequencing — new code must not ship before the remote schema exists, or every DB-touching route fails closed.
- **Externally Visible Contracts [Required in Full; Not applicable in Minimal]**: No HTTP contract changes. Environment contract: `DATABASE_URL` accepts `file:` (local) or `libsql://`/`https://`/`wss://` (remote); remote URLs additionally require `DATABASE_AUTH_TOKEN` (alias `TURSO_AUTH_TOKEN`). Both URL and token also accept Turso's own SDK spellings — `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — with the project-local name winning and blank values falling through rather than shadowing a real one. A remote URL without a token fails fast with an explicit message rather than surfacing an opaque operator error on first query. Route gate is unchanged (`/` 307 → `/login`, authed `200`).
- **Failure or Rollback Considerations [Required in Full; Not applicable in Minimal]**: Misconfigured remote URL without a token fails at client construction with an actionable error (fail closed, mirrors `src/lib/stripe.ts`). Rollback = revert `DATABASE_URL`/token env values to the previous `file:/tmp/ledger.db` pairing and redeploy the prior commit; the hosted database is untouched and the seed is reproducible from `prisma/seed.ts`, so no data is stranded. Deployment ordering is the main risk: applying env + code without first creating the remote schema would break every authenticated route, so schema bootstrap precedes deploy. Credentials are held only in Vercel env (and local `.env`, gitignored) and are never echoed into logs, docs, or commits.
- **Verification Approach [Required in Full; Not applicable in Minimal]**: (1) Unit: `src/lib/datasource.test.ts` — default local URL, local needs no token, remote reads `DATABASE_AUTH_TOKEN`, `TURSO_AUTH_TOKEN` alias, `TURSO_DATABASE_URL` URL alias, precedence with blank-value fall-through, remote-without-token throws, `https`/`wss` treated as remote, local URL drops a stray token; (2) Type: `bunx tsc --noEmit`; (3) Build: `bun run build`; (4) Remote schema: all six migrations applied and seed reports 15 accounts + 2 users; (5) Persistence proof: write a session via a login POST, then read that row back from a separate process against the remote URL; (6) Regression: hosted `307/200` gate + 8 authed routes `200`, `bun test` green.

### Assumption Records

<a id="ASSUMPTION-hosted-libsql-001"></a>
- **Assumption ID [Required]**: `ASSUMPTION-hosted-libsql-001`
- **Unanswered Decision [Required]**: Which hosted libSQL provider.
- **Provisional Answer [Required]**: Turso — libSQL-native, so the installed `@prisma/adapter-libsql` (`PrismaLibSql` implements `SqlMigrationAwareDriverAdapterFactory`) works unchanged. Confirmed with the user this session; the user creates the database and supplies the URL + token.
- **Decision Authority [Required]**: user (account owner)
- **Status [Required]**: `accepted`
- **Revisit Trigger [Optional]**: if Turso's CLI/engine cannot apply Prisma's migration SQL, revisit with Cloudflare D1 (only viable on Workers) or a self-hosted libSQL server.

<a id="ASSUMPTION-hosted-libsql-002"></a>
- **Assumption ID [Required]**: `ASSUMPTION-hosted-libsql-002`
- **Unanswered Decision [Required]**: Whether local development shares the hosted database.
- **Provisional Answer [Required]**: No — local keeps `file:./ledger.db`; only Production and Preview use Turso. Chosen so a developer's test writes can never mutate hosted ledger data.
- **Decision Authority [Required]**: user (chosen this session)
- **Status [Required]**: `accepted`
- **Revisit Trigger [Optional]**: if reproducible bugs need production-shaped data locally, introduce a separate Turso dev database rather than sharing the hosted one.

<a id="ASSUMPTION-hosted-libsql-003"></a>
- **Assumption ID [Required]**: `ASSUMPTION-hosted-libsql-003`
- **Unanswered Decision [Required]**: Whether existing production data must be migrated.
- **Provisional Answer [Required]**: No — production data lives in per-instance `/tmp`, is ephemeral by construction, and is derived from the tracked `ledger.db` seed. The remote database is created fresh from migrations + `prisma/seed.ts`.
- **Decision Authority [Required]**: user
- **Status [Required]**: `accepted`
- **Revisit Trigger [Optional]**: if the user has entered real ledger entries on the live site, export those tables before cutover instead of reseeding.
