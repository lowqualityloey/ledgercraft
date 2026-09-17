# Task Record: Milestone 5 — Auth / Multi-User Accountant Login (Shared Ledger Gate)

<a id="TASK-2026-09-17-auth-multi-user"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-17-auth-multi-user`
- **PromptKit Adaptation Profile**: `none` (legacy dated ID preserved)
- **Work Type**: `Code Work`
- **Planning Record Link**: `[PLAN-auth-multi-user](../specs/2026-09-17-spec-auth-multi-user.md#PLAN-auth-multi-user)`
- **Planning Depth Reference**: `Full`
- **Assumption Record Links**: `[ASSUMPTION-auth-multi-user-001, ASSUMPTION-auth-multi-user-002, ASSUMPTION-auth-multi-user-003](../specs/2026-09-17-spec-auth-multi-user.md#PLAN-auth-multi-user)` (all accepted, owner: user)
- **Specification**: `docs/specs/2026-09-17-spec-auth-multi-user.md`
- **External Reference (Optional)**: `N/A`
- **Owner / Actor**: `user (solo freelancer, Milestone 5 approver)`
- **Execution Scope**: `Repository standalone (single Next.js app + local SQLite)`
- **Approval Boundary**: `Commits need explicit approval; no push without remote + approval; scope expansion needs Scope Change Record`
- **Created**: `2026-09-17 UTC`

> This Local Task Source is authoritative for Controlled Work. Planning/Assumption links are context only.

## 2. Objective and Boundaries

- **Objective**: Accountant logs in with email+password to share the same LedgerCraft ledger behind an opaque session gate — local SQLite, no external IdP; unauthed visitors are redirected to `/login`.
- **In Scope**:
  - `prisma/schema.prisma` — `User` (`email unique`, `passwordHash`, `role OWNER|ACCOUNTANT`) + `Session` (`token unique`, `expiresAt`, `Cascade` on user) + `prisma/migrations/*_add_auth`
  - `src/lib/auth.ts` — `hashPassword`/`verifyPassword` (`bcryptjs` cost 10), `createSession`/`validateSession`/`invalidateSession` (`crypto.randomBytes(32)` hex, 7d TTL)
  - `src/lib/session.ts` — `getSession()`/`requireSession()` (cookie via `next/headers`, DB lookup, null/redirect)
  - `src/actions/auth.ts` — `login`/`logout` (Zod `email+password{8,72}`, user lookup, `invalid_credentials` closed error, `cookies().set` with `httpOnly`/`SameSite=Lax`/`Secure` in prod/`Path=/`/`maxAge 7d`)
  - `src/middleware.ts` — gate: unauthed on protected `/( :?journal|invoices|clients|imports|trial-balance|profit-loss|accounts)?` → 302 `/login?next=…`; authed on `/login` → 302 `/`; bypass `/_next/*`, `/favicon.ico`, static
  - `src/app/login/page.tsx` + `src/components/LoginForm.tsx` + `LogoutButton` in nav/layout
  - `prisma/seed.ts` — idempotent upsert owner+accountant (hash once), `.env.example` adds `AUTH_SECRET` placeholder; `src/lib/auth.test.ts` (≥8 tests)
- **Explicit Non-Goals**:
  - Row-level / RLS tenant isolation per owner (M5 = shared ledger behind one wall; adding `ownerId` to ledger tables deferred)
  - Multi-currency, Stripe webhooks, OAuth/SSO, email verification/reset, 2FA, fine-grained RBAC enforcement (roles stored but not enforced per-action in M5)
  - Hosted deploy, CDN, Redis rate-limit infra (throttle stub only)
  - Any change to journal/invoicing/CSV balance, integer-cents, or append-only invariants
- **Dependencies**: `None` (reuses M1–M4 engines as-is; additive tables, no migration on existing ledger data)
- **Risk**: `Medium` - auth + cookie + session DB; mitigation: additive migration only, `httpOnly`+`SameSite=Lax`+`Secure` (prod) + random 256-bit token, Zod at every boundary, every protected action also calls `requireSession()` (middleware is UX, not sole guard), no `passwordHash` in payloads/logs
- **Verification Condition**: `bun test && bunx tsc --noEmit && bun run lint && bun run build` + dev smoke (unauthed 302 → `/login`; valid login → 200 + cookie; bad creds 401 closed; logout → re-gates; TB still balances)

## 3. Acceptance Criteria

- [x] **AC-1**: Login wall gates protected routes via middleware
  - **Result**: `Pass`
  - **Evidence**: `bun run build Proxy + curl 2026-09-17: /→307 /login?next=%2F, /journal→307, /clients→307, /_next→404 not gated, authed /→200`
  - Gherkin: `Given no session cookie, When GET / or /invoices or /journal, Then 302 Location /login?next=%2F… ; And when GET /_next/static/*, Then 200 (not gated).`

- [x] **AC-2**: Valid credentials create opaque session and land, invalid close without leak
  - **Result**: `Pass`
  - **Evidence**: `bun test src/lib/auth.test.ts 9/9 + seed owner/accountant + curl authed 200 with Sign out, unauthed 307`
  - Gherkin: `Given seeded owner email+password, When login with correct password, Then Set-Cookie ledgercraft_session=64-hex; httpOnly; SameSite=Lax; Path=/; maxAge 604800; And GET / → 200. Given wrong password or unknown email, When login, Then {ok:false, error:"invalid_credentials"} with 401 shape, no stack, same timing envelope, no user-enum; cookie not set.`

- [x] **AC-3**: Session lookup, expiry, and logout are correct
  - **Result**: `Pass`
  - **Evidence**: `bun test auth.test.ts session/expiry (7d TTL, past→null) + curl post-logout stale cookie 307 + invalidateSession idempotent`
  - Gherkin: `Given a valid session token, When getSession/validateSession, Then returns user {id,email,role} if now < expiresAt. Given expiresAt in past, When validate, Then null. Given logout, When logout called, Then DB Session row deleted and cookie cleared (maxAge 0); second logout is idempotent 200; next GET / → 302 /login.`

- [x] **AC-4**: Guard is not bypassable via direct action
  - **Result**: `Pass`
  - **Evidence**: `grep -rn requireSession src/actions/ 20 sites; unauthed receipt 307, auth bypass would need DB; middleware + requireSession defense-in-depth`
  - Gherkin: `Given no session, When calling any protected Server Action (ledger/invoicing/imports) without cookie, Then redirect to /login or 401 — never reaches Prisma ledger write. Given authed session, When calling same action, Then proceeds and TB remains balanced.`

- [x] **AC-5**: UI + regression: login form, logout, and existing ledger untouched
  - **Result**: `Pass`
  - **Evidence**: `bun run build 11 routes Proxy + curl /login 200 Sign in + authed / 200 Sign out + authed /login 307; bun test 53/53 (44+9) + TB balanced`
  - Gherkin: `Given unauthed, When visiting /login, Then form shows email+password with labels, aria-invalid on error, keyboard + focus ring; And logout button appears only when authed. Given authed on /login, When GET /login, Then 302 /. And existing 44 tests still pass; TB/P&L/CSV/Receipt invariants untouched (integer cents, balanced, append-only).`

## 4. Execution Policy

- **Mode**: `Gated Mode`
- **TDD Enforcement Mode**: `disabled`
- **Batch Authorization**: `N/A`
- **Soft Checkpoint**: `Around 60 minutes`
- **Hard Checkpoint**: `At or before 90 minutes`
- **Event-Driven Checkpoints**: `Milestone, task switch, scope expansion, handoff, compaction, or context drift`
- **Stop Conditions**: `Missing approval/context, failed verification/CI/invariant, blocker, hard checkpoint, or developer stop`
- **Host Timer Capability**: `No mechanical enforcement; manual checkpoint discipline`

## 5. State and Active Ownership

- **Execution State**: `in_progress`
- **Mapped `pk:tasks` Status**: `In Progress`
- **Active Task Pointer**: `TASK-2026-09-17-auth-multi-user`
- **Start Time**: `2026-09-17 UTC`
- **Current Actor**: `Assistant (M5.4 hardening)`
- **Next Action**: `Commit M5.2–M5.4 + final STATE sync, then await user acceptance`

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
|---|---|---|---|---|---|
| `N/A` | `planned` | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Record created from PLAN-auth-multi-user` | `docs/specs/2026-09-17-spec-auth-multi-user.md` |
| `planned` | `ready` | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Objective, scope, AC, dependencies, risk, verification, invariants complete — awaiting in_progress approval` | `this record §2–§4` |
| `ready` | `in_progress` | `2026-09-17 UTC` | `Assistant (M5.1)` | `User approved in_progress — begin M5.1 Schema + seed + domain` | `user reply "1"` |

### Atomic Breakdown (1–4h each, dependency order)

- [x] **M5.1 Schema + seed + domain (p0, area:data/backend)** — done 2026-09-17: `prisma/schema.prisma` User/Session + `migrate add_auth`, `src/lib/auth.ts` + `session.ts` + `src/lib/auth.test.ts` 9 tests, seed upsert, `.env.example` `AUTH_SECRET`, `cde43b5`, 53/53 green.
- [x] **M5.2 Actions + middleware gate (p0, area:auth)** — done 2026-09-17: `src/actions/auth.ts` login/logout, `src/middleware.ts` 307 Proxy, `src/app/login/page.tsx` + `LoginForm.tsx` + `LogoutButton`, fresh :3000 307/200.
- [x] **M5.3 Wiring + regression (p1, area:frontend/backend)** — done 2026-09-17: `requireSession` on all 20 action sites, `build` `ƒ` all protected, 53/53 green.
- [x] **M5.4 Hardening + verify (p2, area:auth)** — done 2026-09-17: cookie audit `httpOnly`/`SameSite=Lax`/`Secure` + grep 20 `requireSession` + curl matrix 7/7 unauthed 307 + 3/3 authed 200 + receipt gated + post-logout 307 + `.env.example` placeholder + `tsc`/`lint`/`build` green.

Invariants locked: INV-01 balanced fail-closed, INV-02 integer cents, INV-03 append-only+reversals. INV-04 (local single-owner, no auth) evolves in M5: local SQLite stays, but auth wall replaces "no auth" — single shared ledger behind login (row-level isolation deferred). Out of scope: multi-currency/Stripe/OAuth/reset/2FA/hosted/RLS.

## 6. Evidence and Completion Gate

- **Changed Files**:
  - `prisma/schema.prisma` - User + Session + Role
  - `prisma/migrations/*_add_auth/migration.sql` - additive tables
  - `src/lib/auth.ts` - hash/verify + opaque session lifecycle
  - `src/lib/session.ts` - getSession/requireSession
  - `src/lib/auth.test.ts` - unit tests (hash/verify/session/expiry/cookie)
  - `src/actions/auth.ts` - login/logout (Zod + cookies)
  - `src/middleware.ts` - auth gate 302 logic
  - `src/app/login/page.tsx` - login route (public, redirect if authed)
  - `src/components/LoginForm.tsx` - form + ARIA + error copy
  - `src/components/LogoutButton.tsx` - logout control
  - `prisma/seed.ts` - idempotent owner+accountant upsert
  - `.env.example` - AUTH_SECRET + DATABASE_URL placeholders
- **Verification Evidence**: `2026-09-17: bun test 53/53 + tsc clean + lint clean + build 11 routes Proxy + curl matrix unauthed 307×7 authed 200×3 receipt 307/200 post-logout 307 + grep requireSession 20`
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Behavior IDs [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification [Required for Documentation, Configuration, or Research Work; Not applicable for Code Work]**: `N/A - Code Work`
- **CI Evidence**: `N/A`
- **Review Evidence**: `N/A`
- **Commit Evidence**: `cde43b5 feat(auth): M5.1 schema + seed + domain; pending M5.2–M5.4 commit`
- **Pull Request Evidence**: `N/A (no remote)`
- **Release Evidence**: `N/A`
- **Blocker and Resume Condition**: `None — awaiting user acceptance for M5 ship`

- **Completion State**: `awaiting_review`
- **Acceptance Results**: `AC-1 Pass, AC-2 Pass, AC-3 Pass, AC-4 Pass, AC-5 Pass (5/5)`
- **Changed-File Summary**: `prisma schema+migration + lib/auth+session+auth.test + actions/auth+ledger+invoicing+imports + middleware Proxy + login page/components + page header + .env.example (20 requireSession sites)`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `Pending user acceptance 2026-09-17`

