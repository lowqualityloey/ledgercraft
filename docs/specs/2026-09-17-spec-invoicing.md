# Technical Design Document (RFC): Milestone 2 — Clients + Invoicing

- **Author**: Assistant (pk:plan)
- **Status**: Draft
- **Created**: 2026-09-17
- **Target Release**: Milestone 2

---

## Planning Record (PromptKit Adaptation)

<a id="PLAN-invoicing"></a>

### Planning Record Metadata

- **Planning Record ID [Required]**: `PLAN-invoicing`
- **Planning Depth [Required]**: `Full` (new persistent tables + multi-component: clients UI, invoices UI, ledger posting seam)
- **Owner [Required]**: user (solo freelancer / maintainer)
- **Record Status [Required]**: `draft`
- **Local Task Record Link [Required for Controlled Work]**: `TASK-2026-09-17-invoicing` (to be created via `pk:tasks`; this plan supplies inputs only)
- **Workflow Links [Optional]**: `pk:plan` → `pk:tasks` → build

### Planning Inputs

- **Requested Outcome [Required]**: Solo freelancer can create Clients and Invoices; posting an invoice atomically creates a balanced journal (Dr 1200 AR / Cr 4000 Client Income) in integer cents; marking paid posts payment (Dr 1000 Cash / Cr 1200 AR). TB stays balanced; P&L recognizes revenue at invoice time.
- **Observable Completion Condition [Required]**: Create client → create invoice ($X) → invoice appears `UNPAID`, TB shows AR debit = Revenue credit; mark paid → AR cleared, Cash up, invoice `PAID`; void reverses via append-only reversal. `bun test`, `tsc --noEmit`, `bun run build` green.
- **Scope Boundary [Required]**: In scope: `Client`, `Invoice` (+lines) models, invoice engine seam (`postInvoice`, `markPaid`, `voidInvoice`), Server Actions + `/clients` + `/invoices` UI, TB/P&L reuse. Out of scope: see Non-Goals.
- **TDD Enforcement Proposal (Reference Only) [Optional]**: `disabled` (M1 precedent: contracts + engine tests without Red-Green chain; Task Record owns final mode).

### Full Planning

- **Explicit Non-Goals [Required in Full]**: PDF generation/receipts; bank CSV import; auth/multi-user + login; multi-currency auto-conversion; Stripe webhooks; partial payments (M2 = full-pay only); editing posted journals directly.
- **Affected Behavioral Components [Required in Full]**: Prisma schema (2 new models), `src/lib/invoicing.ts` engine, Server Actions (`src/app/*/actions.ts`), routes `/clients`, `/invoices`, existing `/trial-balance` + `/profit-loss` (read-only reuse).
- **Externally Visible Contracts [Required in Full]**: No public API (local Server Actions only). User-visible: client CRUD, invoice lifecycle `DRAFT→UNPAID→PAID` (+`VOID`), journal linkage (each invoice maps to journal entries).
- **Failure or Rollback Considerations [Required in Full]**: Unbalanced post must fail closed (reuse INV-01); double-pay guarded by status check + unique idempotency; void of paid invoice posts reversal, never deletes; migration is additive-only, rollback = drop new tables.
- **Verification Approach [Required in Full]**: `bun test` (engine: balance, double-pay reject, void reversal, idempotency), `bunx tsc --noEmit`, `bun run lint`, `bun run build`, dev smoke: client → invoice → paid → TB balanced.

### Assumption Records

- **Assumption ID [Required]**: `ASSUMPTION-invoicing-001`
- **Unanswered Decision [Required]**: Revenue recognition timing — at invoice issue vs at payment?
- **Provisional Answer [Required]**: At invoice issue (accrual: Dr AR / Cr Revenue on post; payment only moves AR→Cash).
- **Impact if Wrong [Required]**: Cash-basis users see revenue early; would need status-gated P&L change.
- **Validation Action [Required]**: Confirm with user at `pk:tasks`/review; cheap to flip (P&L filter by paid status).
- **Decision Owner [Required]**: user
- **Status [Required]**: `open`
- **Supporting Evidence [Optional]**: `None`
- **Resolution Evidence [Not applicable until resolved]**: `N/A - unresolved`

### Technology and Vendor Decision Records

`None` — no new external technology; reuses Next.js + Prisma + SQLite + Zod (existing pins preserved, no upgrades).

---

## 1. Executive Summary & Problem Statement

M1 proved manual journaling balances. M2 removes double-entry friction for the core freelancer loop: track who owes you (Clients) and what they owe (Invoices), with the ledger auto-posting balanced entries. Single-owner, local-only (INV-04 holds); no auth, no payments provider.

## 2. Goals and Explicit Non-Goals

### Goals (In Scope)

- Client CRUD (name + email unique, optional notes) at `/clients`.
- Invoice create with ≥1 lines (description, qty, unit cents) → total computed in integer cents, no floats (INV-02).
- Post invoice → atomic balanced journal Dr 1200 AR / Cr 4000 Client Income, status `UNPAID`, idempotent retry safe.
- Mark paid → atomic Dr 1000 Cash / Cr 1200 AR, status `PAID`; double-pay rejected (`ConflictError`).
- Void → append-only reversal of linked entries (INV-03), status `VOID`; void of paid reverses both legs.
- TB/P&L reflect invoices with zero changes to M1 engine.

### Non-Goals (Explicit Scope Boundary)

- PDF, CSV import, auth/multi-user, multi-currency, Stripe, partial payments, dunning/reminders, editing posted entries.

## 3. Architecture & System Context

### High-Level Architecture Diagram

```text
┌──────────────┐  Server Action  ┌────────────────┐  $transaction  ┌──────────────────┐
│ /clients,    ├────────────────►│ InvoicingEngine ├──────────────►│ SQLite (Prisma)  │
│ /invoices UI │  Zod-validated  │ src/lib/       │  journal+      │ Client, Invoice, │
└──────────────┘                 │ invoicing.ts   │  invoice rows  │ JournalEntry     │
                                 └───────┬────────┘                └──────────────────┘
                                         │ calls (no direct Prisma in UI)
                                         ▼
                                 ┌────────────────┐
                                 │ LedgerEngine   │  postJournal() reuse (INV-01/02/03)
                                 │ src/lib/       │
                                 │ ledger.ts      │
                                 └────────────────┘
```

### Deep Module Decomposition & Seams

| Module / Seam | Public Interface / Boundary | Internal Complexity Hidden |
| :--- | :--- | :--- |
| **InvoicingEngine** | `createClient()`, `postInvoice()`, `markPaid()`, `voidInvoice()` | Status machine, totals math, atomic journal+invoice write, idempotency, reversal chaining |
| **LedgerEngine (reuse)** | `postJournal()`, `reverseEntry()` | Balance validation, atomicity, idempotent retry, reversal guard |
| **Invoice UI** | `/clients`, `/invoices` Server Components + Actions | Zod client check, tabular cents display, status badges, keyboard/ARIA per WCAG AA |

Deletion test: InvoicingEngine concentrates lifecycle+posting atomicity in one seam; without it logic scatters across Actions + UI. Keep. No repository layer (M1 precedent).

## 4. Detailed Design & Contracts First

### 4.1 Data Models & Schemas

```prisma
model Client {
  id        String    @id @default(cuid())
  name      String
  email     String    @unique
  notes     String?
  invoices  Invoice[]
  createdAt DateTime  @default(now())
}

enum InvoiceStatus { DRAFT UNPAID PAID VOID }

model Invoice {
  id             String        @id @default(cuid())
  clientId       String
  client         Client        @relation(fields: [clientId], references: [id], onDelete: Restrict)
  number         String        @unique // e.g. INV-0001 (app-sequenced, unique guard)
  status         InvoiceStatus @default(DRAFT)
  subtotalCents  Int
  totalCents     Int
  issueEntryId   String?       @unique // JournalEntry posted at issue
  issueEntry     JournalEntry? @relation("InvoiceIssue", fields: [issueEntryId], references: [id])
  paymentEntryId String?       @unique // JournalEntry posted at pay
  paymentEntry   JournalEntry? @relation("InvoicePay", fields: [paymentEntryId], references: [id])
  idempotencyKey String        @unique
  lines          InvoiceLine[]
  createdAt      DateTime      @default(now())

  @@index([clientId, status])
}

model InvoiceLine {
  id          String  @id @default(cuid())
  invoiceId   String
  invoice     Invoice @relation(fields: [invoiceId], references: [id], onDelete: Restrict)
  description String
  quantity    Int
  unitCents   Int
  lineTotal   Int // quantity * unitCents, integer

  @@index([invoiceId])
}
```

JournalEntry needs two optional back-relations (`invoiceIssue`, `invoicePay`) — additive only.

### 4.2 Zero-Downtime Migration Plan (Expand-Contract)

Additive greenfield tables → Expand-only, no Contract phase:

1. **Phase 1 (Expand)**: `prisma migrate dev` adds `Client`, `Invoice`, `InvoiceLine`, back-relation FKs (all `Restrict`, nullable entry links). No existing data touched.
2. **Phase 2 (Backfill)**: N/A — no historical rows.
3. **Phase 3 (Contract)**: N/A.
- **Rollback Plan (RPO/RTO)**: `prisma migrate resolve --rolled-back` + drop new tables; M1 journal data untouched (separate tables).

### 4.3 API Endpoints & Zod Contracts

Local Server Actions only (no HTTP API). Zod boundaries in `src/lib/invoicing.ts`:

```typescript
export const ClientSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  notes: z.string().max(500).optional(),
});
export const InvoiceLineSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.number().int().positive(),
  unitCents: z.number().int().nonnegative(), // MoneyCents
});
export const PostInvoiceSchema = z.object({
  clientId: z.string().cuid(),
  number: z.string().min(1).max(32),
  lines: z.array(InvoiceLineSchema).min(1),
  issueDate: z.string().datetime(),
  idempotencyKey: z.string().min(8).max(64),
});
export const MarkPaidSchema = z.object({
  invoiceId: z.string().cuid(),
  idempotencyKey: z.string().min(8).max(64),
});
```

Posting math: `lineTotal = qty*unitCents`; `total = Σ`; issue journal = 2 lines (Dr 1200 `total`, Cr 4000 `total`); pay journal = 2 lines (Dr 1000, Cr 1200). All-or-nothing `$transaction`.

---

## 5. Security, Privacy & Failure Modes (FMEA)

### Security & Multi-Tenancy Audit

- Tenancy: N/A single-owner local (INV-04). No auth in M2.
- Input: Zod on every Action; Prisma params only; email uniqueness at DB (`@unique`).
- PII: client emails local-only; never logged; no external calls.

### FMEA Resilience Matrix

| Failure Scenario | Probability / Severity | Detection Method | Mitigation / Fallback | Recovery Strategy |
| :--- | :--- | :--- | :--- | :--- |
| Double submit invoice/pay | High / Medium | Unique `idempotencyKey`, status check | Return existing invoice/entry; `ConflictError` on paid | Idempotent retry returns original |
| Unbalanced auto-post | Low / High | `PostJournalSchema` fail-closed | Abort `$transaction`, invoice stays `DRAFT` | Fix accounts/amounts, retry |
| Double-pay race | Medium / Medium | Status `PAID` guard + unique `paymentEntryId` | Reject second with `ConflictError` | Show paid receipt state |
| Void after pay | Medium / Low | `status` + linked entries check | Post reversals for both legs, set `VOID` | Reversals append-only, audit intact |
| Missing AR/Revenue account | Low / High | Seed-code lookup fail → `NotFoundError` | Block post with clear message | Reseed CoA, retry |

---

## 6. Conditional Implementation Milestones

TDD mode owned by Task Record (proposed `disabled`). Dependency-ordered milestones:

- [ ] **M2.1 — Schema + seed refs**: `Client`/`Invoice`/`InvoiceLine` migration; resolve 1000/1200/4000 by code (not hardcoded id); `bunx prisma generate`.
- [ ] **M2.2 — Engine + unit tests**: `src/lib/invoicing.ts` (`createClient`, `postInvoice`, `markPaid`, `voidInvoice`); tests: totals math, balanced post, idempotent retry, double-pay reject, void reversal. Target ≥10 new tests.
- [ ] **M2.3 — Actions + UI**: `/clients` CRUD + `/invoices` list/detail/create/pay/void; reuse M1 table/mono styles; WCAG AA focus/ARIA.
- [ ] **M2.4 — Reports wiring + hardening**: TB/P&L smoke with invoices; `bun test`, `tsc`, `lint`, `build`, dev smoke 5/5.

### Sign-off Readiness

Spec → `pk:tasks` (stable `TASK-2026-09-17-invoicing` + AC-*) → `pk:grill` optional pre-build. No implementation on this plan alone.

---

## 7. Sign-off & Grilling Checklist

- [ ] Accrual assumption (ASSUMPTION-invoicing-001) accepted or flipped to cash-basis.
- [ ] Full-pay-only scope accepted (partials → Later).
- [ ] Invoice numbering strategy accepted (app-sequenced `INV-XXXX` + unique guard).
- [ ] Architecture challenged via `pk:grill`.
- [ ] Ready for `pk:tasks` Task Record path.
