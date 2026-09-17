# Technical Design Document (RFC): LedgerCraft Milestone 1 — Core Ledger Engine

- **Author**: User (solo freelancer) + Assistant
- **Status**: Draft
- **Created**: 2026-09-17
- **Target Release**: Milestone 1: Core Ledger Engine

---

## Planning Record (PromptKit Adaptation)

<a id="PLAN-core-ledger"></a>

### Planning Record Metadata

- **Planning Record ID [Required]**: `PLAN-core-ledger`
- **Planning Depth [Required]**: `Full` (persistent schema + multi-component + explicitly requested architecture plan)
- **Owner [Required]**: User
- **Record Status [Required]**: `draft`
- **Local Task Record Link [Required for Controlled Work]**: `pending pk:tasks` (no `docs/tasks/<task-id>.md` yet; this spec supplies inputs)
- **Workflow Links [Optional]**: Intake `docs/specs/2026-09-17-intake-ledgercraft.md`

### Planning Inputs

- **Requested Outcome [Required]**: Solo freelancer can define a manual Chart of Accounts, post balanced journal entries in integer cents, and see a mathematically balancing Trial Balance + basic P&L — local-only, no auth.
- **Observable Completion Condition [Required]**: Post one expense + one client payment via UI; Trial Balance debits == credits; P&L shows income/expenses; unbalanced post is rejected with hard error and nothing persists.
- **Scope Boundary [Required]**: In scope — `prisma/schema.prisma`, ledger domain (`postJournal`, balance check, reversals), journal entry Server Actions + forms, CoA CRUD (seeded defaults), TB/P&L queries + tables. Out of scope — see Non-Goals.
- **TDD Enforcement Proposal (Reference Only) [Optional]**: `disabled` (default; canonical Task Record owns mode, absent = disabled).

### Full Planning

- **Explicit Non-Goals [Required in Full]**: Invoicing, clients, PDF generation/receipts, bank CSV imports, auth/multi-user/login, multi-currency conversion, Stripe webhooks, hosted deployment, E2E harness.
- **Affected Behavioral Components [Required in Full]**: CoA management UI, Journal Entry form (Date/Description/Debits/Credits), `POST` journal Server Action, Trial Balance report, P&L report, SQLite ledger store.
- **Externally Visible Contracts [Required in Full]**: `None` — local-only app, no public API. User-visible behavior: journal form validation messages, TB/P&L tables with monospace cents formatting.
- **Failure or Rollback Considerations [Required in Full]**: Unbalanced input must fail closed (no partial writes); float input rejected at boundary; delete/update of posted entries blocked; double-submit guarded by idempotency key; greenfield rollback = drop/recreate dev DB + re-run seed.
- **Verification Approach [Required in Full]**: `bun test` (balance validator, cents math, reversal linkage, TB sums), `bunx tsc --noEmit`, manual local check: expense + payment → TB balances.

### Assumption Records

None beyond intake (`ASSUMPTION-01` no compliance, `ASSUMPTION-02` no prior docs, `ASSUMPTION-03` size medium accepted). No new unanswered required inputs.

### Technology and Vendor Decision Records

`None` — stack locked in intake (`bun + Next.js App Router TS + Prisma + SQLite ledger.db + Tailwind`, Server Actions, integer cents). No new material adoption/replacement in this spec. Exact version pins to be recorded at scaffold (greenfield, latest stable compatible); no web research performed (no new material decision).

---

## 1. Executive Summary & Problem Statement

Freelancers need a trustworthy local ledger without SaaS complexity. Milestone 1 delivers the smallest genuinely useful core: a seeded 5-class Chart of Accounts, an append-only balanced journal with integer-cents math, and Trial Balance + P&L that provably balance. Single-owner, local SQLite, no auth — Later ledger stays out.

## 2. Goals and Explicit Non-Goals

### Goals (In Scope)

- Seeded CoA (Assets, Liabilities, Equity, Revenue, Expenses) with codes from intake, editable descriptions.
- `postJournal` domain that rejects unbalanced/zero/float input with typed errors and persists atomically.
- Reversing-entry correction (no update/delete of posted entries, enforced in app + DB).
- Trial Balance (sum debits == sum credits per account + totals) and basic P&L (revenue − expenses).
- Clean Tailwind dark/light tables, monospace tabular numbers, keyboard-accessible forms.

### Non-Goals (Explicit Scope Boundary)

- Invoicing, clients, PDFs, CSV imports, auth, multi-user, multi-currency, Stripe, hosting, E2E suite.

## 3. Architecture & System Context

### High-Level Architecture Diagram

```text
┌──────────────┐   Server Actions   ┌────────────────┐   Prisma SQL   ┌──────────────────┐
│ Web UI (Next)│───────────────────►│ Ledger Engine  ├───────────────►│ SQLite ledger.db │
│ CoA / Journal│◄───────────────────┤ postJournal /  │◄───────────────┤ Account/Journal  │
│ TB / P&L     │   Typed Result     │ reports        │   sums         │ Entry/Line       │
└──────────────┘                    └────────────────┘                └──────────────────┘
```

### Deep Module Decomposition & Seams

| Module / Seam | Public Interface / Boundary | Internal Complexity Hidden |
| :--- | :--- | :--- |
| **LedgerEngine** | `postJournal(input)`, `reverseEntry(id, reason)` | Zod cents validation, balance sum check, Prisma `$transaction`, reversal linkage, idempotency key |
| **BalanceStore** | `trialBalance()`, `profitAndLoss()` | Group-by aggregation in cents, account-type mapping, zero-account inclusion |
| **JournalForm** | `<JournalForm accounts={...} onPost={...} />` | Dynamic debit/credit lines, live balance indicator, accessible errors |

Deletion test: removing `LedgerEngine` scatters balance/reversal atomicity across UI + actions — it concentrates complexity, so it stays. No separate repository layer (shallow pass-through) — Prisma called directly from engine.

State ownership: SQLite is record; no cache; URL params only for report period filter.

## 4. Detailed Design & Contracts First

### 4.1 Data Models & Schemas

```prisma
model Account {
  id        String      @id @default(cuid())
  code      String      @unique // e.g. 1000, 4000
  name      String
  type      AccountType // ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
  lines     JournalLine[]
  createdAt DateTime    @default(now())
}

enum AccountType { ASSET LIABILITY EQUITY REVENUE EXPENSE }

model JournalEntry {
  id          String        @id @default(cuid())
  date        DateTime
  description String
  idempotencyKey String     @unique
  reversesId  String?       @unique // one reversal per entry
  reverses    JournalEntry? @relation("Reversal", fields: [reversesId], references: [id])
  reversedBy  JournalEntry? @relation("Reversal")
  lines       JournalLine[]
  createdAt   DateTime      @default(now())
  @@index([date])
}

model JournalLine {
  id       String       @id @default(cuid())
  entryId  String
  entry    JournalEntry @relation(fields: [entryId], references: [id], onDelete: Restrict)
  accountId String
  account  Account      @relation(fields: [accountId], references: [id], onDelete: Restrict)
  debit    Int          // integer cents, >= 0
  credit   Int          // integer cents, >= 0
  @@index([accountId])
  @@index([entryId])
}
```

DB invariants: `onDelete: Restrict` (append-only), unique codes/keys, `CHECK` via Prisma + app assertion (debit/credit ≥ 0, exactly one side > 0 per line — enforced in Zod + engine).

### 4.2 Zero-Downtime Migration Plan (Expand-Contract)

Greenfield — no Expand-Contract needed. Initial migration creates 3 tables + seed CoA. Rollback: `prisma migrate reset` (dev only, local single-owner, RPO/RTO N/A). Future alterations must use Expand-Contract.

### 4.3 API Endpoints & Zod Contracts

```typescript
export const MoneyCentsSchema = z.number().int().min(0); // never float; dollars→cents at boundary via parseDollarsToCents()
export const JournalLineSchema = z.object({
  accountId: z.string().cuid(),
  debit: MoneyCentsSchema,
  credit: MoneyCentsSchema,
}).refine(l => (l.debit > 0) !== (l.credit > 0), { message: "Each line must be debit XOR credit" });

export const PostJournalSchema = z.object({
  date: z.string().datetime(),
  description: z.string().min(1).max(200),
  idempotencyKey: z.string().cuid(),
  lines: z.array(JournalLineSchema).min(2),
}).superRefine((v, ctx) => {
  const d = v.lines.reduce((s, l) => s + l.debit, 0);
  const c = v.lines.reduce((s, l) => s + l.credit, 0);
  if (d === 0 || d !== c) ctx.addIssue({ code: "custom", message: `Unbalanced: debits ${d} != credits ${c}` });
});
export type PostJournalInput = z.infer<typeof PostJournalSchema>;
// Engine returns Result<JournalEntry, UnbalancedError | ValidationError> and never partially persists.
```

No public REST — Server Actions `createJournalAction`, `reverseJournalAction`, `getTrialBalance`, `getProfitAndLoss` with same schemas.

---

## 5. Security, Privacy & Failure Modes (FMEA)

### Security & Multi-Tenancy Audit

- Tenancy: N/A single-owner local (INV-04). No auth surface in M1.
- Input: Zod at every Server Action boundary; `parseDollarsToCents` rejects floats/NaN.
- Secrets/PII: none; `.env.example` placeholder for `DATABASE_URL="file:./ledger.db"`.

### FMEA Resilience Matrix

| Failure Scenario | Probability / Severity | Detection Method | Mitigation / Fallback | Recovery Strategy |
| :--- | :--- | :--- | :--- | :--- |
| Unbalanced journal submitted | High / High | `PostJournalSchema` superRefine + engine sum check | Hard error, `$transaction` never opened | User fixes lines; no rows written |
| Float dollars entered (10.10+20.20) | High / High | Boundary parser rejects non-cents | Error "use cents parser" | Re-enter via cents helper |
| Double-submit (double click) | High / Medium | Unique `idempotencyKey` violation | Return existing entry status | Idempotent retry |
| Update/delete posted entry attempted | Medium / High | No update/delete actions; `Restrict` FK | Blocked + "use reversing entry" | Post reversal linked via `reversesId` |
| Reversal of already-reversed entry | Low / Medium | Unique `reversesId` | Reject duplicate reversal | Show existing reversal |

---

## 6. Conditional Implementation Milestones

TDD Enforcement Mode: `disabled` (proposal; Task Record authoritative). Dependency-ordered Code Work milestones:

- [ ] **M1a — Contracts + schema + seed**: Prisma models, Zod schemas, cents parser, seeded CoA. Verify: `bunx tsc --noEmit`, seed lists 5 classes.
- [ ] **M1b — Engine + actions**: `postJournal`/`reverseEntry` atomic, idempotent, tested (balanced ok, unbalanced fails closed, reversal links). Verify: `bun test`.
- [ ] **M1c — UI + reports**: CoA list, journal form with live balance, TB + P&L tables. Verify: manual expense + payment → TB balances.
- [ ] **M1d — Hardening + verify**: No update/delete paths, a11y focus/errors, empty-state handling. Verify: full `bun test` + typecheck green.

Sign-off readiness: milestones link to Task Record (pending `pk:tasks`); acceptance AC-* to be stabilized there.

---

## 7. Sign-off & Grilling Checklist

- [ ] Architecture challenged via `pk:grill`.
- [ ] Greenfield migration (no Expand-Contract) verified.
- [ ] Non-goals agreed (Later ledger untouched).
- [ ] Ready for Task Record path: disabled Code Work (or exception path if docs-only).
