# Technical Design Document (RFC): Multi-Currency Foreign Invoices (Base USD)

- **Author**: Assistant (this session) + user (owner, foreign-client pain)
- **Status**: Draft (awaiting `pk:tasks` Task Record)
- **Created**: 2026-09-17
- **Target Release**: Milestone 6

---

## Planning Record (PromptKit Adaptation)

<a id="PLAN-multi-currency"></a>

> Level 2 (Controlled) — persistent schema + money math + multi-component invoice flow touches ledger invariants and reporting. Full depth required.

### Planning Record Metadata

- **Planning Record ID [Required]**: `PLAN-multi-currency`
- **Planning Depth [Required]**: `Full`
- **Owner [Required]**: user (solo freelancer, M6 approver; foreign client EUR/GBP pilot)
- **Record Status [Required]**: `ready`
- **Local Task Record Link [Required for Controlled Work]**: `docs/tasks/TASK-2026-09-17-multi-currency.md#TASK-2026-09-17-multi-currency` (to be created by `pk:tasks`)
- **Workflow Links [Optional]**: `pk:plan` (this session) → `pk:tasks` → build M6.1–M6.4

### Planning Inputs

- **Requested Outcome [Required]**: Freelancer can invoice a foreign client in EUR/GBP (and default USD) — enter foreign line amounts, supply an FX rate, and have the ledger post in base USD while the invoice and receipt show both foreign and base totals. Solves "foreign client billing" without breaking balanced books.
- **Observable Completion Condition [Required]**: (1) Creating an invoice with `currency=EUR` and `fxRate=1.08` posts a balanced journal in base USD (`baseTotal = round(foreign * 1.08)`); `TB` stays balanced (`debits==credits` in base); (2) `USD` invoices still work with default rate `1.00` unchanged; (3) Receipt shows `EUR 100.00 → USD 108.00` via `formatCents`; (4) `53` existing tests still green + new FX tests green; `tsc`/`lint`/`build` green; fresh `:3000` smoke (USD + EUR invoice) passes.
- **Scope Boundary [Required]**: In scope — `Invoice` `currency` + `fxRateBps` + `baseTotalCents` (and `baseSubtotalCents`), `Currency` enum, `lib/money` `convertCents` helper, `lib/invoicing` FX-aware `postInvoice`, `actions/invoicing` Zod validation, `InvoiceForm` currency select + rate input, `InvoiceList`/`InvoiceReceipt` dual display, migration backfill. Out of scope — live FX API, automatic revaluation, FX gain/loss postings, multi-currency bank CSV imports, Stripe, auth changes, email.
- **TDD Enforcement Proposal (Reference Only) [Optional]**: `disabled` (proposed; Task Record owns final mode).

### Full Planning

- **Explicit Non-Goals [Required in Full; Not applicable in Minimal]**: Live/external FX fetch (e.g., ECB, openexchangerates); periodic revaluation or unrealized FX gain/loss journals; bank CSV multi-currency detection; Stripe multi-currency presentment; base-currency configurability per-org (base fixed to `USD` in M6); JPY 0-decimal exact handling beyond integer-cents simplification; changing existing M1–M5 journal line schema (lines stay base-only).
- **Affected Behavioral Components [Required in Full; Not applicable in Minimal]**: (1) DB: `prisma/schema.prisma` `Currency` + `Invoice` new columns + migration; (2) Money domain: `src/lib/money.ts` `convertCents` + `CURRENCY_CODES`; (3) Invoicing engine: `src/lib/invoicing.ts` FX-aware totals + journal in base; (4) Server Actions: `src/actions/invoicing.ts` Zod `currency`+`fxRateBps`; (5) UI: `src/app/invoices/**`, `src/components/InvoiceForm.tsx`, `InvoiceList.tsx`, `InvoiceReceipt.tsx` dual display; (6) Reports: `trialBalance`/`profitAndLoss` remain base-only (no change, documented).
- **Externally Visible Contracts [Required in Full; Not applicable in Minimal]**: No public API. Extended Server Action contract: `createInvoiceAction({clientId, number, issueDate, currency?, fxRate?, lines:{description,quantity,unit}[]})` where `currency` is `Currency` enum (default `USD`), `fxRate` is dollars-per-foreign string like `"1.08"` parsed to `fxRateBps` integer (10000 = 1.00, 4 decimals), `unit` still dollars-per-foreign foreign cents. Journal stays base-only (no new external contract). Zod at every boundary.
- **Failure or Rollback Considerations [Required in Full; Not applicable in Minimal]**: FX float leak prevented by integer math only; unbalanced prevented by posting `baseTotalCents` derived via `convertCents(foreignTotal)` and asserting `debit==credit==baseTotal`; wrong rate caught by Zod `1000..50000` bps (0.10–5.00) + required `currency≠USD` must have rate ≠10000. Rollback = revert migration before shipped; additive columns with defaults → rolling back code without DB leaves `currency/fxRateBps/baseTotalCents` unused, harmless (no ledger data loss).
- **Verification Approach [Required in Full; Not applicable in Minimal]**: (1) Unit: `src/lib/money.test.ts` + `invoicing.test.ts` — `convertCents` rounding, EUR invoice totals, journal base, idempotency, void; (2) Type: `bunx tsc --noEmit`; (3) Lint: `bun run lint`; (4) Build: `bun run build` with `/invoices` dual display; (5) Smoke: `bun dev` — USD invoice 100.00 → base 100.00, EUR invoice 100.00×1.08 → base 108.00, TB balanced, receipt shows both; (6) Regression: `bun test` 53+ new green.

### Assumption Records

<a id="ASSUMPTION-multi-currency-001"></a>
- **Assumption ID [Required]**: `ASSUMPTION-multi-currency-001`
- **Unanswered Decision [Required]**: Base currency for the books.
- **Provisional Answer [Required]**: Base = `USD` fixed for M6. All journals, TB, P&L are base USD.
- **Impact if Wrong [Required]**: If base must be EUR or tenant-configurable, need `Organization.baseCurrency` and report conversion — current plan under-reports.
- **Validation Action [Required]**: Confirm base USD with owner; reopen if EUR base needed.
- **Decision Owner [Required]**: user
- **Status [Required]**: `accepted`
- **Supporting Evidence [Optional]**: `None`
- **Resolution Evidence [Not applicable until resolved]**: `N/A - unresolved`

<a id="ASSUMPTION-multi-currency-002"></a>
- **Assumption ID [Required]**: `ASSUMPTION-multi-currency-002`
- **Unanswered Decision [Required]**: FX rate source.
- **Provisional Answer [Required]**: Manual rate input per invoice (user pastes ECB/bank rate as `"1.08"`). No live fetch in M6.
- **Impact if Wrong [Required]**: If live fetch required, need external API + cache + `FxRate` table + secrets.
- **Validation Action [Required]**: Validate with foreign pilot client; defer live fetch to Later if needed.
- **Decision Owner [Required]**: user
- **Status [Required]**: `accepted`
- **Supporting Evidence [Optional]**: `None`
- **Resolution Evidence [Not applicable until resolved]**: `N/A - unresolved`

<a id="ASSUMPTION-multi-currency-003"></a>
- **Assumption ID [Required]**: `ASSUMPTION-multi-currency-003`
- **Unanswered Decision [Required]**: Currency set.
- **Provisional Answer [Required]**: 6 codes for M6: `USD, EUR, GBP, JPY, CAD, AUD` (USD default). JPY treated as 2-decimal cents for M6 (100 = 1 unit) — exact 0-decimal handling deferred.
- **Impact if Wrong [Required]**: If more codes needed, extend enum + form select — low cost.
- **Validation Action [Required]**: Confirm pilot needs EUR/GBP only; extend if CAD/JPY requested.
- **Decision Owner [Required]**: user
- **Status [Required]**: `accepted`
- **Supporting Evidence [Optional]**: `None`
- **Resolution Evidence [Not applicable until resolved]**: `N/A - unresolved`

### Technology and Vendor Decision Records

<a id="DECISION-multi-currency-001"></a>
#### Decision Record: `DECISION-multi-currency-001`

- **Decision ID [Required]**: `DECISION-multi-currency-001`
- **Decision Statement [Required]**: How to represent currency and FX rate without float, atomically with existing SQLite/libSQL + Prisma 7.10, preserving INV-02 integer cents.
- **Considered Options [Required]**: (A) `Currency` enum + `fxRateBps` integer basis-points (10000=1.00, 4 decimals) + `baseTotalCents = round(foreignTotal * fxRateBps / 10000)` in `lib/money`; (B) store `fxRate` as string decimal + parse float at post time; (C) add `FxRate` table with `base/quote/date` and live fetch.
- **Selected Option(s) [Required]**: (A) enum + `fxRateBps` integer + `convertCents` integer helper (boring, no float, no new service, trivial backfill).
- **Rejected Option(s) [Required]**: (B) float string → float math → violates INV-02 and rounding nondeterminism; (C) live table + API — overkill for 2-currency pilot, adds secrets/cache/rate-limit.
- **Material Claim Links [Required]**: `[CLAIM-DECISION-multi-currency-001-001](#CLAIM-DECISION-multi-currency-001-001)`
- **Remaining Uncertainty [Required]**: `None`
- **Decision Owner [Required]**: user
- **Status [Required]**: `decided`

##### Version Selection Fields

- **Version Selection Context [Required when versioned]**: `Existing project` (Next 16.3.5, Prisma 7.10.0, Bun 1.4.2) — no new versioned dep.
- **AI Recommendation [Optional when versioned]**: `Not applicable - no AI recommendation`
- **Selected Exact Version(s) [Required when versioned]**: `Not applicable - no version selected` (reuses existing pins)
- **Release Channel [Required when versioned]**: `Not applicable - no version selected`
- **Support/Lifecycle Status [Required when versioned]**: `Not applicable - no version selected`
- **Compatibility Constraints [Required when versioned]**: `Not applicable - no version selected`
- **Version Rationale [Required when versioned]**: `Not applicable - no version selected`
- **Exact-Version Evidence [Required when versioned]**: `Not applicable - no version selected`
- **Existing Version Baseline [Required for existing project]**: `next@16.3.5, prisma@7.10.0, @libsql/client@^0.18` preserved
- **Decision Owner Approval or Accepted Assumption [Required]**: user, approved `decided` 2026-09-17
- **pk:spike or ADR Link [Optional]**: `None`

<a id="CLAIM-DECISION-multi-currency-001-001"></a>
#### Material Claim Record: `CLAIM-DECISION-multi-currency-001-001`

- **Claim ID [Required]**: `CLAIM-DECISION-multi-currency-001-001`
- **Decision Link [Required]**: `[DECISION-multi-currency-001](#DECISION-multi-currency-001)`
- **Material Claim [Required]**: Integer basis-points `fxRateBps` (10000=1.00) allows FX conversion via `Math.round(foreignCents * fxRateBps / 10000)` with no float, preserving INV-02.
- **Citation or Uncertainty Link [Required]**: `[CITATION-DECISION-multi-currency-001-001](#CITATION-DECISION-multi-currency-001-001)`

<a id="CITATION-DECISION-multi-currency-001-001"></a>
#### Citation Record: `CITATION-DECISION-multi-currency-001-001`

- **Citation ID [Required]**: `CITATION-DECISION-multi-currency-001-001`
- **Publisher [Required]**: LedgerCraft internal (INV-02 integer cents invariant)
- **Document Title [Required]**: PROMPTKIT.md §7 Monetary Precision + docs/STATE.md INV-02
- **Canonical URL [Required]**: `file:./PROMPTKIT.md` + `file:./docs/STATE.md`
- **Access Date [Required]**: `2026-09-17`
- **Supported Claim Link [Required]**: `[CLAIM-DECISION-multi-currency-001-001](#CLAIM-DECISION-multi-currency-001-001)`
- **Citation Status [Required]**: `verified`

---

## 1. Executive Summary & Problem Statement

M1–M5 ship a single-ledger, single-currency (USD) book behind an auth wall. The owner now invoices a foreign client (EUR pilot, GBP next) and needs the invoice to show foreign amounts while the ledger stays balanced in base USD — no float, no bespoke FX service. M6 adds `currency` + `fxRateBps` + `baseTotalCents` to `Invoice`, a `convertCents` integer helper, and FX-aware posting/display. Base remains USD (M6), reports stay base-only, and the FX rate is a manual per-invoice input (live fetch deferred). All existing USD invoices keep working with default `USD/1.00`.

---

## 2. Goals and Explicit Non-Goals

### Goals (In Scope)

- `Currency` enum (`USD, EUR, GBP, JPY, CAD, AUD`) — `USD` default, stored on `Invoice`.
- FX rate as integer basis-points (`fxRateBps`, 10000=1.00, 4 decimals, Zod `1000..50000`, USD must be `10000`).
- `Invoice` stores `subtotalCents`/`totalCents` (foreign) + `baseSubtotalCents`/`baseTotalCents` (base USD) via `convertCents(foreign, fxRateBps)` — `Math.round(foreign * fxRateBps / 10000)` with integer cents.
- `lib/invoicing` `postInvoice` posts journal in **base** cents (Dr `1200` AR / Cr `4000` = `baseTotalCents`), keeps foreign totals for display, and preserves idempotency/balance (INV-01 still `debit==credit==base`).
- UI: `InvoiceForm` currency select + FX rate input (shows calculated base), `InvoiceList` + `InvoiceReceipt` show `EUR 100.00 → USD 108.00` when `currency≠USD`.
- Migration backfills existing invoices as `USD/10000/base=foreign`.
- Verification: `bun test` 53+ new FX tests green, `tsc`/`lint`/`build` green, smoke USD + EUR invoice + TB balanced.

### Non-Goals (Explicit Scope Boundary)

- Live FX API fetch, cached `FxRate` table, or provider keys.
- Revaluation, unrealized FX gain/loss journals, or post-payment FX adjustments.
- Multi-currency bank CSV imports or Stripe presentment.
- Base-currency per-org configurability (M6 base fixed `USD`).
- JPY 0-decimal exact minor-unit handling beyond 2-decimal simplification.
- Any change to `JournalLine` schema (lines stay base-only), auth, or ledger invariants other than the additive invoice columns.

---

## 3. Architecture & System Context

### High-Level Architecture Diagram

```text
┌─────────┐  create EUR 100  ┌──────────────────┐  convert  ┌──────────────┐
│ InvoiceForm├────────────►│ actions/invoicing├────────►│ lib/money    │
│ currency+fx│  Zod valid   │ postInvoice      │  round  │ convertCents │
└─────────┬─┘              └────────┬─────────┘  integer └──────┬───────┘
          │                         │ baseTotalCents             │
          │                         ▼                            │
          │              ┌──────────────────┐     base journal   │
          │              │ Prisma Invoice   │  Dr1200/Cr4000     │
          └─────────────►│ + base totals    ├───────────────────►│ SQLite │
                          └────────┬─────────┘   base-only      └────────┘
                                   │ dual display
                                   ▼
                          ┌──────────────────┐
                          │ InvoiceList/Receipt│  foreign → base
                          └──────────────────┘
```

Reports (`trialBalance`, `profitAndLoss`) stay base-only — no FX branching.

### Deep Module Decomposition & Seams

| Module / Seam | Public Interface / Boundary | Internal Complexity Hidden |
| :--- | :--- | :--- |
| **Money FX** `lib/money.ts` | `convertCents(foreignCents: number, fxRateBps: number): number` + `CURRENCY_CODES` | Integer `Math.round(foreign*fxRateBps/10000)`, Zod `MoneyCents` guard, no float |
| **Invoicing engine** `lib/invoicing.ts` | `postInvoice(input: PostInvoiceInput)` extended with `currency`, `fxRateBps` | Foreign total calc, `convertCents` → `baseTotal`, journal in base, foreign preserved, idempotency unchanged |
| **Actions** `actions/invoicing.ts` | `createInvoiceAction({...currency, fxRate})` | Zod `currency` enum + `fxRate` string→`fxRateBps` int, USD guard, `parseDollarsToCents` stays foreign |
| **InvoiceForm** `components/InvoiceForm.tsx` | `<InvoiceForm currencies={…} />` | Select + rate input (4 decimals), live base preview via `convertCents`, mono formatting |
| **Receipt** `components/InvoiceReceipt.tsx` | `<InvoiceReceipt invoice={…} />` | Foreign total + `→ base` when `currency≠USD`, else single total |

Deletion test: removing `convertCents` collapses FX math into `postInvoice` (single coherent place, not duplication) — kept separate only because it’s pure integer math with independent test surface and future reuse for payments/CSV.

---

## 4. Detailed Design & Contracts First

### 4.1 Data Models & Schemas

```prisma
enum Currency {
  USD
  EUR
  GBP
  JPY
  CAD
  AUD
}

model Invoice {
  // ... existing
  currency          Currency @default(USD)
  fxRateBps         Int      @default(10000) // 10000 = 1.00, 4 decimals, 1000..50000
  baseSubtotalCents Int      @default(0) // will be backfilled = subtotalCents for existing USD
  baseTotalCents    Int      @default(0)

  @@index([currency])
}
```

Options deferred: no `FxRate` table, no `JournalLine.currency`, no per-line FX. `InvoiceLine` stays foreign cents; `baseLineTotal` derived only at invoice level for M6.

### 4.2 Zero-Downtime Migration Plan (Expand-Contract)

1. **Expand** (M6.1): `prisma migrate dev --name add_currency` adds `Currency` enum + `Invoice` columns as **nullable with defaults** (`currency USD`, `fxRateBps 10000`, `base… 0`). App still boots with old data; new code writes new columns, old code ignores them.
2. **Backfill & Read Switch**: One-shot `UPDATE Invoice SET currency='USD', fxRateBps=10000, baseSubtotalCents=subtotalCents, baseTotalCents=totalCents WHERE currency IS NULL` (or via Prisma `updateMany`). Switch `postInvoice` read path to use `baseTotalCents` for journal.
3. **Contract**: In subsequent deployment, make columns required (already defaulted) — no drop. Future base-configurability would add `Setting.baseCurrency` — not in M6. Rollback before Contract is a plain revert + drop columns (additive only).

- **Rollback Plan (RPO/RTO)**: If FX rate mis-handled, revert commit before migration is applied to hosted; locally `prisma migrate reset` restores `ledger.db`. Additive columns → rolling back code without DB leaves unused columns harmless, no ledger data loss.

### 4.3 API Endpoints & Zod Contracts

No REST — Server Actions. Zod at every boundary.

```typescript
// src/lib/money.ts
export const CurrencySchema = z.enum(["USD","EUR","GBP","JPY","CAD","AUD"]);
export type Currency = z.infer<typeof CurrencySchema>;
export function convertCents(foreignCents: number, fxRateBps: number): number {
  // integer: Math.round(foreignCents * fxRateBps / 10000)
}

// src/lib/invoicing.ts
export const PostInvoiceSchema = z.object({
  clientId: z.string().cuid(),
  number: z.string().min(1).max(32),
  currency: CurrencySchema.default("USD"),
  fxRateBps: z.number().int().min(1000).max(50000).default(10000),
  lines: z.array(InvoiceLineSchema).min(1),
  issueDate: z.string().datetime(),
  idempotencyKey: z.string().min(8).max(56),
}).superRefine((v, ctx) => {
  if (v.currency === "USD" && v.fxRateBps !== 10000) ctx.addIssue({code:"custom", message:"USD must use 1.0000"});
  if (v.currency !== "USD" && v.fxRateBps === 10000) { /* allow 1.00 but not required */ }
});

// src/actions/invoicing.ts
export async function createInvoiceAction(input: {
  clientId: string; number: string; issueDate: string;
  currency?: Currency; fxRate?: string; // "1.08" → 10800
  lines: { description: string; quantity: string; unit: string }[];
}): Promise<ActionResult<{invoiceId:string}>>;
// fxRate string parsed via /^\d+(\.\d{1,4})?$/ → Math.round(parseFloat(fxRate)*10000)
// unit still foreign dollars via parseDollarsToCents
```

Money invariant: all displays via `formatCents`, FX via `convertCents` — no float math.

---

## 5. Security, Privacy & Failure Modes (FMEA)

### Security & Multi-Tenancy Audit

- **Tenancy**: M5 auth wall still; no new tenant data. All actions still `requireSession()`.
- **Input**: `currency` enum via `CurrencySchema`, `fxRateBps` via `z.number().int().min(1000).max(50000)`, `fxRate` string via `/^\d+(\.\d{1,4})?$/`. Rejects `0`, negative, `>5.00`, `NaN`, `Infinity`, float-as-number.
- **PII/Secrets**: No new PII. No external FX call, so no API key.
- **Injection**: No dynamic SQL; Prisma only.

### FMEA Resilience Matrix

| Failure Scenario | Probability / Severity | Detection Method | Mitigation / Fallback | Recovery Strategy |
| :--- | :--- | :--- | :--- | :--- |
| FX float used / rounding off 1c | Medium / High | `bun test` FX cases + TB balanced | `convertCents` integer only, `Math.round` once, no `*` float | Fix helper, re-test TB |
| USD with non-1.00 rate | Low / Medium | Zod refine | Reject `USD fxRateBps≠10000` with 400 | User corrects rate |
| Foreign total 0 or negative | Low / Low | Zod + `total>0` | Fail closed, no journal | User fixes lines |
| Rate out of range (0.0001 or 99.00) | Low / Low | Zod `1000..50000` | 400 at action | User fixes |
| Old invoices missing base | Low / High | Migration verify | Backfill `base=foreign` for existing `USD` | Re-run backfill |
| Receipt shows wrong arrow (USD → USD) | Low / Low | Manual smoke | Render `→ base` only when `currency≠USD` | CSS-only fix |
| Concurrent double-post same number | Medium / Low | `Invoice.number unique` + idempotency | `P2002` → return existing | Idempotent retry |

---

## 6. Conditional Implementation Milestones

TDD Enforcement Mode: `disabled` (proposed; Task Record owns final). Dependency-ordered milestones; all `disabled` path.

- [ ] **M6.1 Schema + money (p0)** — `prisma/schema.prisma` `Currency` + `Invoice` columns + migration + backfill, `src/lib/money.ts` `convertCents` + `CurrencySchema` + unit tests. Accepts: `prisma generate` + `bun test` money cases + `tsc` clean.
- [ ] **M6.2 Engine + tests (p0)** — `src/lib/invoicing.ts` FX-aware `postInvoice` (foreign→base, journal in base) + `src/lib/invoicing.test.ts` (USD + EUR totals, journal base, idempotency, void). Accepts: `bun test` 53+ new green, TB balanced in base.
- [ ] **M6.3 UI + receipt (p1)** — `src/actions/invoicing.ts` `currency`/`fxRate` parsing, `InvoiceForm.tsx` select+rate+preview, `InvoiceList.tsx`/`InvoiceReceipt.tsx` dual display, `getInvoiceReceipt` returns `baseDisplay` when needed. Accepts: `build` green, `/invoices` shows `EUR → USD`.
- [ ] **M6.4 Hardening + verify (p2)** — `tsc`/`lint`/`build` green, `grep -n fxRateBps` + `convertCents` audit (no float), smoke `USD 100→100` + `EUR 100×1.08→108` + `TB balanced` + `CSV` still base-only, `.env` hygiene unchanged, `requireSession` still on all actions.

### Sign-off Readiness

Milestones, acceptance (§2 + §4.3), review path (`pk:review` on request), and verification condition (§2) are recorded. This spec does not authorize commits — `pk:commit` needs explicit approval. Task Record at `docs/tasks/TASK-2026-09-17-multi-currency.md` must be created via `pk:tasks` before code.

---

## 7. Sign-off & Grilling Checklist

- [ ] Architecture challenged via `pk:grill` (recommended — FX rounding is high-risk; run before M6.1).
- [ ] Zero-downtime database evolution verified (additive columns with defaults + backfill, per §4.2).
- [ ] Non-goals agreed with stakeholder (manual rate, no live fetch, no revaluation).
- [ ] Ready for Task Record milestone path (`disabled` proposed; Task Record owns final).

