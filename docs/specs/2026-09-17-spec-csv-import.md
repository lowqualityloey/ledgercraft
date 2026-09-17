# Technical Design Document (RFC): Milestone 3 — Bank CSV Import

- **Author**: Assistant (pk:plan)
- **Status**: Draft
- **Created**: 2026-09-17
- **Target Release**: Milestone 3

---

## Planning Record (PromptKit Adaptation)

<a id="PLAN-csv-import"></a>

### Planning Record Metadata

- **Planning Record ID [Required]**: `PLAN-csv-import`
- **Planning Depth [Required]**: `Full` (new persistent table + multi-component: upload UI, parse/match seam, journal posting)
- **Owner [Required]**: user (solo freelancer / maintainer)
- **Record Status [Required]**: `draft`
- **Local Task Record Link [Required for Controlled Work]**: `TASK-2026-09-17-csv-import` (to be created via `pk:tasks`; this plan supplies inputs only)
- **Workflow Links [Optional]**: `pk:plan` → `pk:tasks` → build

### Planning Inputs

- **Requested Outcome [Required]**: Solo freelancer uploads a bank CSV; each row becomes a reviewable draft (date, payee, amount, suggested offset account); confirming posts atomic balanced journals (one leg Cash 1000, other leg chosen account) in integer cents; re-uploading the same file is rejected as duplicate.
- **Observable Completion Condition [Required]**: Upload sample CSV → drafts listed with parsed amounts → pick offset accounts → post → TB stays balanced, posted count == rows; same file re-upload → duplicate error, zero new entries. `bun test`, `tsc --noEmit`, `bun run build` green.
- **Scope Boundary [Required]**: In scope: `ImportBatch` model, `src/lib/csvImport.ts` (parse + fingerprint + draft builder), `/imports` UI (upload, draft table, post), Server Actions reusing `postJournal`. Out of scope: see Non-Goals.
- **TDD Enforcement Proposal (Reference Only) [Optional]**: `disabled` (M1/M2 precedent; Task Record owns final mode).

### Full Planning

- **Explicit Non-Goals [Required in Full]**: Auto-categorization rules/ML; bank API sync (Plaid etc.); multi-currency conversion (amounts assumed home currency); PDF; editing posted entries; CSV export.
- **Affected Behavioral Components [Required in Full]**: Prisma schema (`ImportBatch`), `src/lib/csvImport.ts` engine, Server Actions (`src/app/*/actions.ts` or `src/actions/imports.ts`), route `/imports`, TB reuse (read-only).
- **Externally Visible Contracts [Required in Full]**: No public API (local Server Actions only). User-visible: file upload (.csv, ≤1MB, ≤500 rows), draft review table, per-row offset account picker, post-all / post-selected, duplicate-file guard.
- **Failure or Rollback Considerations [Required in Full]**: Malformed rows fail the file with row-numbered errors, nothing posts (all-or-nothing per post batch via per-row idempotent `postJournal` + batch completion flag; partial post resumes by skipping rows whose idempotency keys exist). Duplicate file hash → reject before parse-post. Migration additive-only.
- **Verification Approach [Required in Full]**: `bun test` (parser: quoted commas, signs, 2-decimals, bad-row errors; fingerprint dedup; post-selected posts only chosen rows; re-post idempotent), `tsc`, `lint`, `build`, dev smoke: upload → post → TB balanced → re-upload rejected.

### Assumption Records

- **Assumption ID [Required]**: `ASSUMPTION-csv-import-001`
- **Unanswered Decision [Required]**: Expected CSV shape — which bank format (columns, date format, debit/credit vs single amount)?
- **Provisional Answer [Required]**: Single flexible shape: auto-detect header among `date,description,amount` OR `date,description,debit,credit`; dates ISO/`MM/DD/YYYY`; amounts `$1,234.56`, negatives = money out.
- **Impact if Wrong [Required]**: User's real bank file may not parse; would need a format-profile addition (small, additive).
- **Validation Action [Required]**: User uploads real file at acceptance; mismatch → fast follow-up profile.
- **Decision Owner [Required]**: user
- **Status [Required]**: `open`
- **Supporting Evidence [Optional]**: `None`
- **Resolution Evidence [Not applicable until resolved]**: `N/A - unresolved`

- **Assumption ID [Required]**: `ASSUMPTION-csv-import-002`
- **Unanswered Decision [Required]**: Default cash-side account for the bank leg.
- **Provisional Answer [Required]**: `1000 Cash/Bank` (code-resolved); user picks the offset account per row.
- **Impact if Wrong [Required]**: Users with multiple bank accounts miscategorize the cash leg; fix = per-batch cash account picker (additive).
- **Validation Action [Required]**: Confirm at acceptance.
- **Decision Owner [Required]**: user
- **Status [Required]**: `open`
- **Supporting Evidence [Optional]**: `None`
- **Resolution Evidence [Not applicable until resolved]**: `N/A - unresolved`

### Technology and Vendor Decision Records

- **Decision**: No new dependency — hand-rolled CSV parser (~60 lines, quoted-field aware) over `papaparse`.
- **Rationale**: M3 needs only a narrow CSV subset; a vendored parser keeps integer-cents control at the boundary, zero supply-chain/version risk, fully unit-testable. Upgrade path: adopt `papaparse` if real-world files break the subset (recorded follow-up, not built).
- **Status**: `decided` (owner: user, via plan acceptance)

---

## 1. Executive Summary & Problem Statement

M2 removed invoicing friction. Remaining manual pain: typing bank activity line-by-line into the journal. M3 lets the freelancer upload a bank CSV, review auto-built drafts, and post them as balanced journals — with duplicate-file protection so a double-upload never double-books. Single-owner, local-only (INV-04 holds).

## 2. Goals and Explicit Non-Goals

### Goals (In Scope)

- Upload `.csv` (≤1MB, ≤500 rows, ≤50KB/row sanity) at `/imports`; shapes: `date,description,amount` or `date,description,debit,credit`.
- Row-numbered parse errors; whole file rejected on any bad row (nothing posts, batch recorded as `FAILED` or not at all).
- Draft table: date, payee, amount (mono), offset-account picker (default 5900 Misc), include-checkbox per row.
- Post selected → per-row balanced journals (money-out: Dr offset / Cr 1000; money-in: Dr 1000 / Cr offset) via `postJournal` idempotency (`sha256(file):rowIndex`); batch marked `POSTED` with posted count.
- Re-upload same bytes → `ConflictError`, zero new entries/batches.
- TB/P&L reflect imports with zero M1/M2 engine changes.

### Non-Goals (Explicit Scope Boundary)

- Categorization rules/ML, bank API sync, FX conversion, PDF, CSV export, editing posted entries, multi-account cash legs per batch.

## 3. Architecture & System Context

```text
┌──────────────┐  Server Action  ┌────────────────┐  postJournal()  ┌──────────────────┐
│ /imports UI  ├────────────────►│ CsvImportEngine ├──────────────►│ SQLite (Prisma)  │
│ upload+draft │  text ≤1MB      │ src/lib/       │  idempotent     │ ImportBatch,     │
└──────────────┘                 │ csvImport.ts   │  per-row keys   │ JournalEntry     │
                                 └────────────────┘                └──────────────────┘
```

| Module / Seam | Public Interface | Internal Complexity Hidden |
| :--- | :--- | :--- |
| **CsvImportEngine** | `parseCsv()`, `fingerprint()`, `buildDrafts()`, `postDrafts()` | Quoted-field parsing, header auto-detect, cents conversion, hash dedup, per-row balanced mapping |
| **LedgerEngine (reuse)** | `postJournal()` | Balance validation, atomicity, idempotent retry |
| **Imports UI** | `/imports` upload + draft table + post | File-size guard, per-row pickers, status badges, ARIA |

Deletion test: engine concentrates parse/fingerprint/post math in one seam. Keep. No repository layer (precedent).

## 4. Detailed Design & Contracts First

### 4.1 Data Models & Schemas

```prisma
enum ImportStatus { DRAFT POSTED FAILED }

model ImportBatch {
  id             String       @id @default(cuid())
  filename       String
  fileHash       String       @unique // sha256 of raw bytes
  rowCount       Int
  status         ImportStatus @default(DRAFT)
  postedCount    Int          @default(0)
  idempotencyKey String       @unique
  createdAt      DateTime     @default(now())
}
```

Drafts are **not persisted** — rebuilt deterministically from the uploaded text (kept in Action closure / hidden form field round-trip, ≤1MB) or re-uploaded. Posted journals link back only via idempotency-key prefix (`imp-{hash8}:{index}`); batch stores counts, not FKs (keeps migration trivial, avoids cross-table coupling).

### 4.2 Zero-Downtime Migration Plan (Expand-Contract)

Expand-only, additive table, no existing data touched. Rollback = drop `ImportBatch`.

### 4.3 API Endpoints & Zod Contracts

Local Server Actions only. Zod boundaries in `src/lib/csvImport.ts`:

```typescript
export const CsvUploadSchema = z.object({
  filename: z.string().min(1).max(120),
  content: z.string().min(1).max(1_000_000), // ≤1MB text
  idempotencyKey: z.string().min(8).max(56),
});
export const DraftPostSchema = z.object({
  batchId: z.string().cuid(),
  rows: z.array(z.object({
    index: z.number().int().nonnegative(),
    offsetAccountId: z.string().cuid(),
    include: z.boolean(),
  })).min(1).max(500),
  fileHash: z.string().length(64),
  content: z.string().min(1).max(1_000_000), // re-sent for deterministic rebuild
});
```

Row mapping: `amountCents > 0` (money in): Dr 1000 / Cr offset; `< 0`: Dr offset / Cr 1000 (abs). Zero-amount rows rejected at parse. Per-row key `imp-{hash.slice(0,8)}:{index}` (≤16 chars ✓).

---

## 5. Security, Privacy & Failure Modes (FMEA)

- Tenancy: N/A single-owner local. Input: size/row caps, Zod everywhere, Prisma params only. PII: bank data local-only, never logged (errors carry row numbers, not raw content).

| Failure Scenario | Probability / Severity | Detection | Mitigation | Recovery |
| :--- | :--- | :--- | :--- | :--- |
| Malformed row | High / Low | Row-numbered `ValidationError` | Reject file, post nothing | Fix CSV, re-upload (new hash) |
| Same file twice | High / Medium | Unique `fileHash` | `ConflictError`, zero writes | Show existing batch status |
| Double-click Post | High / Medium | Per-row idempotency keys | `postJournal` returns originals | Reconcile counts, mark POSTED |
| Partial post crash | Low / Medium | `postedCount` vs rows | Resume: skip keys that exist | Re-run post-selected |
| 500-row giant | Low / Low | Cap check | Reject >500 with message | Split file |

---

## 6. Conditional Implementation Milestones

TDD mode owned by Task Record (proposed `disabled`). Dependency order:

- [ ] **M3.1 — Schema**: `ImportBatch` migration; `bunx prisma generate`.
- [ ] **M3.2 — Engine + unit tests**: `csvImport.ts` + tests (parse shapes, quotes, signs, cents, bad rows, dedup, draft mapping, idempotent post). Target ≥12 tests.
- [ ] **M3.3 — Actions + UI**: `/imports` upload + draft table + post-selected; home nav.
- [ ] **M3.4 — Hardening + verify**: grep (no float, no direct writes), full gate, dev smoke, manual acceptance.

### Sign-off Readiness

Spec → `pk:tasks` (`TASK-2026-09-17-csv-import` + AC-*) → build. No implementation on this plan alone.

---

## 7. Sign-off & Grilling Checklist

- [ ] CSV shape assumption (ASSUMPTION-csv-import-001) accepted or revised with a real file.
- [ ] Cash-leg assumption (ASSUMPTION-csv-import-002, 1000 fixed) accepted.
- [ ] Drafts-unpersisted tradeoff accepted (re-upload/re-send vs draft table).
- [ ] Architecture challenged via `pk:grill`.
- [ ] Ready for `pk:tasks`.
