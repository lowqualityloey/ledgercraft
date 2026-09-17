# Technical Design Document (RFC): Auth / Multi-User — Accountant Login (Shared Ledger Gate)

- **Author**: Assistant (this session) + user (owner, accountant pain)
- **Status**: Draft (awaiting `pk:tasks` Task Record)
- **Created**: 2026-09-17
- **Target Release**: Milestone 5

---

## Planning Record (PromptKit Adaptation)

<a id="PLAN-auth-multi-user"></a>

> Level 2 (Controlled) — auth + schema + cookie/session boundary touches multiple components and persistent data. Full depth required. This section is canonical planning location.

### Planning Record Metadata

- **Planning Record ID [Required]**: `PLAN-auth-multi-user`
- **Planning Depth [Required]**: `Full`
- **Owner [Required]**: user (solo freelancer, Milestone 5 approver; accountant = second user)
- **Record Status [Required]**: `ready`
- **Local Task Record Link [Required for Controlled Work]**: `docs/tasks/TASK-2026-09-17-auth-multi-user.md#TASK-2026-09-17-auth-multi-user` (to be created by `pk:tasks`; this spec supplies inputs)
- **Workflow Links [Optional]**: `pk:plan` (this session) → `pk:tasks` → `pk:grill` (optional) → build M5.1–M5.4

### Planning Inputs

- **Requested Outcome [Required]**: Accountant can log in with email+password, land on a protected LedgerCraft session, and share the same ledger (journal/invoices/imports/reports) behind an auth wall — local SQLite, no external IdP. Solves "accountant needs login" without leaking the ledger to unauthenticated visitors.
- **Observable Completion Condition [Required]**: (1) Unauthenticated `GET /` or `/invoices` redirects to `/login` (middleware gate); (2) valid credentials set an `httpOnly` session cookie and land on `/` without 500; (3) invalid credentials show a typed `401` with no stack leak; (4) `Logout` clears cookie + invalidates session; (5) existing 44 tests still green + new auth contract tests green; `tsc` + `lint` + `build` green; fresh `:3000` smoke passes both states.
- **Scope Boundary [Required]**: In scope — `User` + `Session` tables, credential hash + session-token auth, login/logout routes + forms, middleware gate, session helpers, seed owner account, secret via `DATABASE_URL` + `AUTH_SECRET` in `.env`. Out of scope — row-level tenant isolation per owner (shared ledger in M5), multi-currency, Stripe, OAuth/SSO, email verification/reset, SAML, RBAC beyond `OWNER`/`ACCOUNTANT` (same shared access in M5).
- **TDD Enforcement Proposal (Reference Only) [Optional]**: `disabled` (proposed; Task Record owns final mode).

### Full Planning

- **Explicit Non-Goals [Required in Full; Not applicable in Minimal]**: Multi-currency auto-conversion; Stripe webhooks/payments; OAuth/Google/Microsoft SSO; email verification, password reset, 2FA; fine-grained RBAC/RLS per-ledger isolation; hosted deployment or public webhook URL; any change to journal/invoicing/CSV balance or integer-cents invariants.
- **Affected Behavioral Components [Required in Full; Not applicable in Minimal]**: (1) DB: new `User`/`Session` models + migration; (2) Auth domain: `src/lib/auth.ts` (hash/verify/session) + `src/lib/session.ts`; (3) Edge: `src/middleware.ts` (cookie gate, redirect, CSRF-aware); (4) UI: `src/app/login/page.tsx` + `LoginForm` + `LogoutButton`, nav updated; (5) Server Actions: `login`/`logout`/`getSession`; (6) Seed: owner user bootstrap; (7) Config: `.env.example` + `AUTH_SECRET`.
- **Externally Visible Contracts [Required in Full; Not applicable in Minimal]**: No public API. New UI surface: `GET /login` (public), `POST` via Server Action `login({email,password}) → {ok}|{error:"invalid_credentials"}`, `logout()` clears cookie. Cookie: `ledgercraft_session` `httpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, TTL 7d. Middleware: unauthed → 302 `/login?next=…`, authed on `/login` → 302 `/`. Zod at every boundary.
- **Failure or Rollback Considerations [Required in Full; Not applicable in Minimal]**: Schema rollback = revert migration (new tables only, no column drops on existing data — see §4.2). Auth failure closed: invalid creds → 401, no timing leak, no user enum. Session hijack mitigated by `httpOnly` + `SameSite=Lax` + `Secure` + random 32-byte token. Concurrent logout handled by idempotent delete. Multi-currency/Stripe drift avoided by non-goals above.
- **Verification Approach [Required in Full; Not applicable in Minimal]**: (1) Unit: `src/lib/auth.test.ts` — hash/verify, session create/validate/expire, cookie attrs; (2) Type: `bunx tsc --noEmit`; (3) Lint: `bun run lint`; (4) Build: `bun run build` includes `ƒ /login`; (5) Smoke: `curl` + `bun dev` — unauthed 302 to `/login`, authed 200, wrong pass 401, logout clears and re-gates; (6) Regression: `bun test` (44 existing + new, zero float).

### Assumption Records

<a id="ASSUMPTION-auth-multi-user-001"></a>
- **Assumption ID [Required]**: `ASSUMPTION-auth-multi-user-001`
- **Unanswered Decision [Required]**: Deployment remains local-only (`bun dev` on owner's machine shared via LAN/tunnel) vs hosted.
- **Provisional Answer [Required]**: Treat M5 as local-only with `Secure` cookie off in dev and on in production; no public URL assumed. Stripe/hosted path stays deferred.
- **Impact if Wrong [Required]**: If hosted is required for accountant remote access, need reverse proxy/HTTPS + production `AUTH_SECRET` rotation plan.
- **Validation Action [Required]**: Confirm with owner before any hosted deploy; `ASSUMPTION` reopens if remote URL introduced.
- **Decision Owner [Required]**: user
- **Status [Required]**: `accepted`
- **Supporting Evidence [Optional]**: `None`
- **Resolution Evidence [Not applicable until resolved]**: `N/A - unresolved`

<a id="ASSUMPTION-auth-multi-user-002"></a>
- **Assumption ID [Required]**: `ASSUMPTION-auth-multi-user-002`
- **Unanswered Decision [Required]**: RBAC granularity — does accountant need read-only vs full post/pay?
- **Provisional Answer [Required]**: `OWNER` and `ACCOUNTANT` share full access to the single ledger in M5 (auth gate only, no row filter). Roles stored but not enforced per-action yet; `ACCOUNTANT` ≠ read-only.
- **Impact if Wrong [Required]**: If read-only is required, need per-action RBAC checks and audit log; current plan over-grants.
- **Validation Action [Required]**: Validate with accountant before M5 ship; promote to per-route RBAC in M5.4 hardening if needed.
- **Decision Owner [Required]**: user
- **Status [Required]**: `accepted`
- **Supporting Evidence [Optional]**: `None`
- **Resolution Evidence [Not applicable until resolved]**: `N/A - unresolved`

<a id="ASSUMPTION-auth-multi-user-003"></a>
- **Assumption ID [Required]**: `ASSUMPTION-auth-multi-user-003`
- **Unanswered Decision [Required]**: Second user onboarding — self-signup vs owner-seeded.
- **Provisional Answer [Required]**: No public signup. Owner and accountant are seeded via `prisma/seed.ts` / one-off script; login only.
- **Impact if Wrong [Required]**: If self-signup needed, need invite flow + rate limit + email.
- **Validation Action [Required]**: Confirm during M5.1 seed design; reopen if invite flow requested.
- **Decision Owner [Required]**: user
- **Status [Required]**: `accepted`
- **Supporting Evidence [Optional]**: `None`
- **Resolution Evidence [Not applicable until resolved]**: `N/A - unresolved`

### Technology and Vendor Decision Records

<a id="DECISION-auth-multi-user-001"></a>
#### Decision Record: `DECISION-auth-multi-user-001`

- **Decision ID [Required]**: `DECISION-auth-multi-user-001`
- **Decision Statement [Required]**: Select credential-auth stack for Next.js 16.3 + Prisma + SQLite (libSQL adapter) under local-only constraint — password hashing, session token, cookie, and gate.
- **Considered Options [Required]**: (A) Custom opaque session: `bcryptjs` + `crypto.randomBytes(32)` token stored in `Session` + `httpOnly` cookie + `src/middleware.ts` gate; (B) Auth.js (next-auth) v5 credentials provider + `@auth/prisma-adapter`; (C) `better-auth` with Prisma adapter; (D) `argon2` native hashing + `jose` JWT.
- **Selected Option(s) [Required]**: (A) Custom opaque session with `bcryptjs` + opaque token + middleware gate (boring default, zero new native deps, no adapter churn).
- **Rejected Option(s) [Required]**: (B) Auth.js — heavier provider abstraction, adapter version churn, overkill for 2 local users, adds `next-auth` peer surface without OAuth need; (C) `better-auth` — newer, less proven for libSQL/SQLite local, extra migration; (D) `argon2` — native build, fails on Bun + triples install friction vs `bcryptjs` pure JS; `jose` JWT — key rotation + stateless revocation cost avoided by opaque token (revoke = delete row).
- **Material Claim Links [Required]**: `[CLAIM-DECISION-auth-multi-user-001-001](#CLAIM-DECISION-auth-multi-user-001-001)`, `[CLAIM-DECISION-auth-multi-user-001-002](#CLAIM-DECISION-auth-multi-user-001-002)`
- **Remaining Uncertainty [Required]**: `[UNCERTAINTY-DECISION-auth-multi-user-001-001](#UNCERTAINTY-DECISION-auth-multi-user-001-001)`
- **Decision Owner [Required]**: user
- **Status [Required]**: `decided`

##### Version Selection Fields

- **Version Selection Context [Required when versioned]**: `Existing project` (Next 16.3.5, Prisma 7.10.0, Bun 1.4.2 pinned) + greenfield for auth deps.
- **AI Recommendation [Optional when versioned]**: `bcryptjs@3.0.2` (stable, pure JS) + `jose` not needed for opaque path; if JWT later, `jose@6.x`.
- **Selected Exact Version(s) [Required when versioned]**: `bcryptjs@3.0.2` (new pin), no `jose` in M5; Next.js/Prisma/Bun pins preserved.
- **Release Channel [Required when versioned]**: `stable`
- **Support/Lifecycle Status [Required when versioned]**: `bcryptjs` stable maintenance (pure JS, no native lifecycle); Next 16.3.5 / Prisma 7.10.0 active stable.
- **Compatibility Constraints [Required when versioned]**: Bun 1.4.2 compatible with `bcryptjs` (no native); `@prisma/adapter-libsql@7.10.0` requires `@libsql/client@^0.18`; middleware cookie API requires Next 15+ (`NextRequest`/`NextResponse`).
- **Version Rationale [Required when versioned]**: Preserve existing stable pins; `bcryptjs` avoids native `argon2` build failures on Bun and keeps `bun install` clean. Opaque token avoids JWT key management for 2-user local.
- **Exact-Version Evidence [Required when versioned]**: Citation records below (accessed 2026-09-17).
- **Existing Version Baseline [Required for existing project]**: `next@16.3.5`, `prisma@7.10.0`, `@libsql/client@^0.18`, `bun@1.4.2` — preserved.
- **Decision Owner Approval or Accepted Assumption [Required]**: user, approved `decided` 2026-09-17 (this spec).
- **pk:spike or ADR Link [Optional]**: `None` (no spike; boring-default path).

<a id="CLAIM-DECISION-auth-multi-user-001-001"></a>
#### Material Claim Record: `CLAIM-DECISION-auth-multi-user-001-001`

- **Claim ID [Required]**: `CLAIM-DECISION-auth-multi-user-001-001`
- **Decision Link [Required]**: `[DECISION-auth-multi-user-001](#DECISION-auth-multi-user-001)`
- **Material Claim [Required]**: `bcryptjs@3.0.2` is pure-JavaScript bcrypt with no native build, compatible with Bun 1.4.2, and avoids `argon2` native compilation.
- **Citation or Uncertainty Link [Required]**: `[CITATION-DECISION-auth-multi-user-001-001](#CITATION-DECISION-auth-multi-user-001-001)`

<a id="CITATION-DECISION-auth-multi-user-001-001"></a>
#### Citation Record: `CITATION-DECISION-auth-multi-user-001-001`

- **Citation ID [Required]**: `CITATION-DECISION-auth-multi-user-001-001`
- **Publisher [Required]**: bcryptjs project (npm / GitHub `dcodeIO/bcrypt.js`)
- **Document Title [Required]**: bcryptjs npm README — pure JS bcrypt
- **Canonical URL [Required]**: https://www.npmjs.com/package/bcryptjs
- **Access Date [Required]**: `2026-09-17`
- **Supported Claim Link [Required]**: `[CLAIM-DECISION-auth-multi-user-001-001](#CLAIM-DECISION-auth-multi-user-001-001)`
- **Citation Status [Required]**: `verified`

<a id="CLAIM-DECISION-auth-multi-user-001-002"></a>
#### Material Claim Record: `CLAIM-DECISION-auth-multi-user-001-002`

- **Claim ID [Required]**: `CLAIM-DECISION-auth-multi-user-001-002`
- **Decision Link [Required]**: `[DECISION-auth-multi-user-001](#DECISION-auth-multi-user-001)`
- **Material Claim [Required]**: Next.js 16.3 middleware (`src/middleware.ts` with `NextRequest`/`NextResponse` + `cookies()`) is the canonical auth gate for App Router, replacing `experimental` patterns.
- **Citation or Uncertainty Link [Required]**: `[CITATION-DECISION-auth-multi-user-001-002](#CITATION-DECISION-auth-multi-user-001-002)`

<a id="CITATION-DECISION-auth-multi-user-001-002"></a>
#### Citation Record: `CITATION-DECISION-auth-multi-user-001-002`

- **Citation ID [Required]**: `CITATION-DECISION-auth-multi-user-001-002`
- **Publisher [Required]**: Vercel / Next.js
- **Document Title [Required]**: Next.js Middleware documentation
- **Canonical URL [Required]**: https://nextjs.org/docs/app/api-reference/file-conventions/middleware
- **Access Date [Required]**: `2026-09-17`
- **Supported Claim Link [Required]**: `[CLAIM-DECISION-auth-multi-user-001-002](#CLAIM-DECISION-auth-multi-user-001-002)`
- **Citation Status [Required]**: `verified`

<a id="UNCERTAINTY-DECISION-auth-multi-user-001-001"></a>
#### Uncertainty Record: `UNCERTAINTY-DECISION-auth-multi-user-001-001`

- **Uncertainty ID [Required]**: `UNCERTAINTY-DECISION-auth-multi-user-001-001`
- **Affected Claim or Context [Required]**: Production deployment target (Vercel/Node vs continued `bun dev` local) and thus whether `Secure` cookie + `AUTH_SECRET` rotation via hosted env is required.
- **Impact [Required]**: If hosted, need `Secure` + `__Host-` prefix, secret rotation runbook, and proxy trust; local-only keeps existing `.env` flow.
- **Resolution Action [Required]**: `Proceed with an explicitly accepted assumption` (`ASSUMPTION-auth-multi-user-001`) — local-only for M5, revisit if hosted requested. Decision owner: user. Status `accepted`.

---

## 1. Executive Summary & Problem Statement

LedgerCraft ships M0–M4 as a single-owner local ledger (`ledger.db`, `bun dev`, no auth — INV-04). The owner now needs an accountant to log in and co-work the same books (journal, invoices, imports, TB/P&L, receipts). Without an auth gate the ledger is exposed to anyone with the URL, and audit intent is untracked.

Milestone 5 adds a minimal credential-auth wall: email+password login, opaque session cookie, middleware gate, logout, and seeded owner+accountant users — still SQLite/libSQL, still integer cents + balanced journal untouched, still `bun dev` local-only. Shared-ledger access in M5; row-level tenant isolation and multi-currency/Stripe remain Later ledger.

---

## 2. Goals and Explicit Non-Goals

### Goals (In Scope)

- Email+password login at `ƒ /login` with Zod boundary validation, `bcryptjs` hash (cost 10), and typed `invalid_credentials` error — no user enumeration.
- Opaque session: `crypto.randomBytes(32)` hex token in `Session`, `httpOnly` `SameSite=Lax` cookie (`Secure` in production), 7-day TTL, `Session.expiresAt` + `User` relation, Prisma-managed.
- Middleware gate (`src/middleware.ts`): unauthed on protected routes → 302 `/login?next=…`; authed on `/login` → 302 `/`; public assets + `/_next/*` bypass.
- Logout clears cookie + deletes session row (idempotent).
- Seeded users (owner + accountant) via `prisma/seed.ts`; no public signup in M5.
- Verification: `bun test` (44 + new auth tests) green, `tsc` clean, `lint` clean, `build` green (incl `ƒ /login`), smoke both authed/unauthed.

### Non-Goals (Explicit Scope Boundary)

- Row-level multi-tenant data isolation (Owner A vs Tenant B books) — deferred; M5 is shared ledger behind one auth wall.
- Multi-currency auto-conversion, FX, Stripe webhooks — remain Later ledger.
- OAuth/SSO, SAML, magic link, email verification, password reset, 2FA.
- RBAC enforcement per-action beyond storing `role` (`OWNER`/`ACCOUNTANT` share access in M5).
- Hosted deployment, CDN, rate-limit infra beyond in-process throttle stub.

---

## 3. Architecture & System Context

### High-Level Architecture Diagram

```text
┌──────────┐  GET /  ┌─────────────────┐  cookie?  ┌──────────────┐  read  ┌─────────────────┐
│ Browser  ├───────►│ Next middleware ├─────────►│ Server Action│───────►│ SQLite (Prisma) │
│ /login   │  POST  │ src/middleware  │  302/200 │ login/logout │  CRUD  │ User + Session  │
└────┬─────┘        └────────┬────────┘          └──────┬───────┘        └─────────────────┘
     │               httpOnly SameSite=Lax               │ props / redirect
     │  authed       cookie ledgercraft_session          ▼
     └──────────────►┌────────────────┐          ┌────────────────┐
                    │ App routes     │          │ LoginForm      │
                    │ /journal etc   │◄─────────│ (presentational)│
                    └────────────────┘          └────────────────┘
```

Deep seam: `src/lib/auth.ts` owns hashing, session lifecycle, and cookie attrs; middleware only reads cookie and calls `validateSession`, never hashes.

### Deep Module Decomposition & Seams

| Module / Seam | Public Interface / Boundary | Internal Complexity Hidden |
| :--- | :--- | :--- |
| **Auth domain** `src/lib/auth.ts` | `hashPassword`, `verifyPassword`, `createSession(userId)`, `validateSession(token)`, `invalidateSession(token)` | `bcryptjs` cost, `crypto.randomBytes`, TTL, Prisma `Session` CRUD, expiry check, timing-safe compare via `bcryptjs` |
| **Session helpers** `src/lib/session.ts` | `getSession()`, `requireSession()` | Cookie read (`cookies()`), DB lookup, `null` vs redirect, no throw leak |
| **Middleware gate** `src/middleware.ts` | `middleware(req: NextRequest)` | Matching protected paths, `nextUrl` preserves `?next=`, public bypass list, cookie validation (light — deep check in `requireSession`) |
| **Login/Logout Actions** `src/actions/auth.ts` | `login(input)`, `logout()` | Zod `z.object({email:z.string().email(), password:z.string().min(8)})`, user lookup, `verifyPassword`, `createSession` + `cookies().set`, error mapping |
| **Login UI** `src/app/login/page.tsx` + `LoginForm.tsx` | `GET /login`, `<LoginForm onSubmit={login}>` | Server redirect if authed, client form, `aria-invalid`, focus ring, error copy from action — no business logic |
| **Seed** `prisma/seed.ts` | `seed()` called by `bunx prisma db seed` | Upsert owner/accountant from env or defaults, hash once, idempotent |

Deletion test: removing `lib/auth.ts` collapses hashing + session + TTL into actions/middleware (single incoherent place) — kept separate because route (server) vs middleware (edge) have different runtimes and test surfaces.

---

## 4. Detailed Design & Contracts First

### 4.1 Data Models & Schemas

Additive tables only; existing `Account`/`JournalEntry`/`Client`/`Invoice`/`ImportBatch` untouched. Roles stored but not enforced per-action in M5 (see assumptions).

```prisma
enum Role {
  OWNER
  ACCOUNTANT
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String    // bcryptjs hash, never select in API payloads
  name         String?
  role         Role      @default(OWNER)
  sessions     Session[]
  createdAt    DateTime  @default(now())

  @@index([email])
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique // hex 64 chars from randomBytes(32)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime // now + 7d
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
}
```

Options deferred: no `emailVerified`, no `resetToken`, no per-ledger `orgId`. Future tenant isolation would add `ownerId` to ledger tables — not in M5.

### 4.2 Zero-Downtime Migration Plan (Expand-Contract)

No destructive change. New tables only → plain Prisma migration, no Expand-Contract backfill.

1. **Expand** (M5.1): `prisma migrate dev --name add-auth` creates `User` + `Session`. App still boots with old data; new code dual-reads only after migration.
2. **Read switch**: Middleware + `getSession` read `Session`/`User`; no old column to switch from.
3. **Backfill**: Seed upserts owner/accountant; no historical row rewrite.
4. **Contract**: None in M5 (no old column to drop). Future row-level isolation would follow Expand (add `ownerId nullable`) → Backfill → Contract (make required, drop permissive).

- **Rollback Plan (RPO/RTO)**: If auth migration fails, revert commit before `migrate` is pushed to hosted; locally `prisma migrate reset` restores `ledger.db` snapshot (RPO = last local backup; RTO ~ minutes). Auth is additive, so rolling back code without DB leaves orphan tables — harmless, no ledger data loss. RPO/RTO owned by `docs/STATE.md` checkpoint before M5 build.

### 4.3 API Endpoints & Zod Contracts

No REST — Server Actions + middleware. Zod at every boundary.

```typescript
// src/actions/auth.ts
export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72), // bcrypt 72-byte limit
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export async function login(input: LoginInput):
  Promise<{ ok: true } | { ok: false; error: "invalid_credentials" | "invalid_input" }>;

export async function logout(): Promise<void>;

// src/lib/session.ts
export async function getSession(): Promise<{ user: { id: string; email: string; role: Role } } | null>;
export async function requireSession(): Promise<{ user: { id: string; email: string; role: Role } }>;
// requireSession redirects to /login?next=… if null (Next redirect(), not throw)

// Cookie contract (set via next/headers cookies().set)
{
  name: "ledgercraft_session",
  value: "<64-hex>",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
}
```

Money invariant untouched: no float, all ledger writes remain via `src/lib/ledger.ts` with balance check.

---

## 5. Security, Privacy & Failure Modes (FMEA)

### Security & Multi-Tenancy Audit

- **Tenancy Boundary**: M5 = single shared ledger behind auth wall (one org). No cross-tenant leak possible because no tenant partition yet; future `ownerId` RLS will need explicit delete-test. Middleware is not the sole guard — every Server Action that touches ledger calls `requireSession()` before Prisma.
- **Authentication**: `bcryptjs` cost 10, never log hash; `verifyPassword` failure path indistinguishable (same latency envelope, same `invalid_credentials` copy). No user enumeration: unknown email follows same failure shape.
- **Session**: Token = `crypto.randomBytes(32).toString("hex")` (256-bit entropy), stored `unique` indexed, `httpOnly` + `SameSite=Lax` + `Secure` (prod). TTL 7d, expired → treated as missing → 302 `/login`.
- **CSRF**: Server Actions are POST with same-site cookie; future `origin` check if hosted. No `GET` state change.
- **Input Sanitization**: Zod at action boundary; Prisma parameterized queries only; email lowercased before lookup.
- **Secrets & PII**: `passwordHash` never returned to client; logs redact email local part; `.env.example` has `AUTH_SECRET="change-me-in-prod"` + `DATABASE_URL="file:./ledger.db"` placeholders only; `.env` gitignored.
- **RBAC**: `Role` column present but not enforced in M5 (assumption 002). Adding per-action checks is M5.4 hardening if accountant read-only is required.

### FMEA Resilience Matrix

| Failure Scenario | Probability / Severity | Detection Method | Mitigation / Fallback | Recovery Strategy |
| :--- | :--- | :--- | :--- | :--- |
| Invalid creds (wrong pass / unknown email) | High / Low | Manual + smoke | Zod + `verifyPassword` → `invalid_credentials` 401, no stack | User retries; no lockout in M5 (rate stub) |
| Stolen cookie / XSS exfil | Low / High | Audit | `httpOnly` + `SameSite=Lax` + `Secure` (prod), no token in JS, short TTL | Owner calls `logout` (delete row) or deletes Session row; rotate `AUTH_SECRET` if hosted |
| Session expired / DB missing | Medium / Low | Smoke (expired `expiresAt`) | `validateSession` checks `expiresAt` → treat as unauthed → 302 login | Re-login |
| Concurrent logout double-delete | Low / Low | Idempotent delete | `deleteMany` where token; second call no-op | No error |
| Middleware bypass (direct action call) | Low / High | Grep `requireSession` | Every mutating + sensitive read action gates on `requireSession()`; middleware is UX, not sole guard | Add missing guard, rebuild |
| Brute force login | Medium / Medium | Log 401 burst | In-process throttle stub (5/min/IP comment) — full rate limit deferred to hosted | Block IP at proxy or add Redis limiter |
| Hash DoS (long password) | Low / Low | Zod max 72 | `z.string().max(72)` + bcrypt limit | Reject at boundary before hash |
| Migration leaves orphan sessions | Low / Low | `prisma migrate status` | Additive tables only; rollback is code revert | `prisma migrate reset` locally; prod requires backup before migrate |

---

## 6. Conditional Implementation Milestones

TDD Enforcement Mode: `disabled` (proposed; Task Record owns final). Dependency-ordered milestones; all `disabled` path (no Red/Green/Refactor gate).

- [ ] **M5.1 Schema + seed + domain (p0)** — `prisma/schema.prisma` add `User`/`Session` + migration, `src/lib/auth.ts` + `src/lib/session.ts` + unit tests `src/lib/auth.test.ts`, seed owner/accountant (idempotent upsert), `.env.example` updated. Accepts: `bunx prisma generate && bun test` green, `tsc` clean.
- [ ] **M5.2 Actions + middleware gate (p0)** — `src/actions/auth.ts` `login`/`logout` (Zod + `requireSession` pattern), `src/middleware.ts` 302 logic, `src/app/login/page.tsx` + `LoginForm.tsx` + `LogoutButton` in nav. Accepts: `build` shows `ƒ /login`, unauthed `GET /` → 302 `/login`, bad creds 401 copy.
- [ ] **M5.3 Wiring + regression (p1)** — Guard all protected actions/pages with `requireSession()`, preserve ledger invariants (no journal change), `prisma/seed.ts` docs. Accepts: `bun test` 44+ new green, manual `login→ /journal → logout → gate` flow.
- [ ] **M5.4 Hardening + verify (p2)** — Cookie attrs audit (`httpOnly`/`SameSite`/`Secure`), grep `requireSession` on every action, optional RBAC enforcement if assumption 002 flips, `tsc`/`lint`/`build` green, smoke `curl` matrix (authed 200, unauthed 302, invalid 401, logout 302), `.env.example` hygiene grep.

### Sign-off Readiness

Milestones, acceptance (§2 + §4.3), review path (`pk:review` on request), and verification condition (§2) are recorded. This spec does not authorize commits — `pk:commit` needs explicit approval. Task Record at `docs/tasks/TASK-2026-09-17-auth-multi-user.md` must be created via `pk:tasks` before code.

---

## 7. Sign-off & Grilling Checklist

- [ ] Architecture challenged via `pk:grill` (recommended — auth gate is high-risk; run before M5.1).
- [ ] Zero-downtime database evolution verified (additive tables only, per §4.2).
- [ ] Non-goals agreed with stakeholder (shared-ledger vs tenant-isolated, no OAuth/reset).
- [ ] Ready for Task Record milestone path (`disabled` proposed; Task Record owns final).

