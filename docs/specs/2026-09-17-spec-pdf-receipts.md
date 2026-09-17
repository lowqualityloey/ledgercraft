# Technical Design Document (RFC, Request for Comments): Invoice PDF Receipts (Browser Print)

- **Author**: Assistant (this session)
- **Status**: Implemented
- **Created**: 2026-09-17
- **Target Release**: Milestone 4

---

## Planning Record (PromptKit Adaptation)

<a id="PLAN-pdf-receipts"></a>

> Level 1 (Standard) work — lightweight inline planning. This section records
> the three Minimal inputs for traceability; the canonical Task Record file
> was not required (L1 rule) and implementation is already landed uncommitted.

### Planning Record Metadata

- **Planning Record ID [Required]**: `PLAN-pdf-receipts`
- **Planning Depth [Required]**: `Minimal`
- **Owner [Required]**: user (solo freelancer, Milestone 4 approver)
- **Record Status [Required]**: `ready`
- **Local Task Record Link [Required for Controlled Work]**: `N/A - L1 Standard work, no Task Record file`
- **Workflow Links [Optional]**: `pk:plan` (this session) → build M4.1–M4.3

### Planning Inputs

- **Requested Outcome [Required]**: Open any invoice and produce a clean,
  professional receipt via browser Print / Save-as-PDF, with zero new
  dependencies.
- **Observable Completion Condition [Required]**: Receipt at
  `/invoices/[id]` shows client, invoice number, lines, and total matching
  `formatCents(totalCents)`; Print button prints receipt only; `bun test` +
  `tsc` + `lint` + `build` green.
- **Scope Boundary [Required]**: In scope — new read-only receipt route,
  presentational receipt component, print stylesheet, per-invoice Receipt
  link. Out of scope — schema/migrations, server PDF bytes, email/send,
  multi-currency, auth, ledger engine changes.
- **TDD Enforcement Proposal (Reference Only) [Optional]**: `disabled`
  (no Task Record; proposal only, defaults apply).

### Full Planning

- `N/A - Minimal depth (L1). No public contract, schema, auth, external
  integration, or multi-component risk. Failure/rollback and verification
  notes are in §5–§6 below.`

### Assumption Records

- `None` — all three Minimal inputs answered; no required input unanswered.

### Technology and Vendor Decision Records

- `None` — no material Technology/Vendor Decision. The build adds zero
  dependencies (browser `window.print()` + CSS only). `pdf-lib`/`pdfkit`/
  `puppeteer` were considered during planning and rejected before any
  adoption; rejection rationale lives in §2 Non-Goals and §6 milestones.
  Merely naming them here does not create a decision record.

---

## 1. Executive Summary & Problem Statement

Solo freelancer needs a professional invoice receipt to share with clients
and keep for records (Later ledger item from intake
`docs/specs/2026-09-17-intake-ledgercraft.md:36`). Milestone 4 delivers a
read-only receipt view per invoice plus a print stylesheet, so the browser's
Print / Save-as-PDF flow produces the receipt. No new dependencies, no
schema change, ledger invariants untouched.

---

## 2. Goals and Explicit Non-Goals

### Goals (In Scope)

- Receipt route `ƒ /invoices/[id]` rendering client, number, status, issue
  date, line table, and total from integer cents.
- One-click Print / Save-as-PDF button (`window.print()`); printed output
  contains the receipt only (nav/buttons hidden), light ink.
- Per-invoice `Receipt` link on `/invoices`; keyboard-focusable with ARIA
  labels (WCAG 2.2 AA for new controls).
- Verification: `bun test` 44/0, `tsc` clean, `lint` clean, `build` green
  (10 routes incl. `ƒ /invoices/[id]`).

### Non-Goals (Explicit Scope Boundary)

- Server-side PDF byte generation (`pdf-lib` recorded upgrade path only).
- Emailing receipts, receipt editing, void/pay from receipt view.
- Multi-currency, auth/multi-user, Stripe (remain in Later ledger).
- Any change to journal/invoicing/CSV engines or the database schema.

---

## 3. Architecture & System Context

### High-Level Architecture Diagram

```text
┌──────────────┐      GET       ┌────────────────────┐      read      ┌──────────────────┐
│ Browser      ├───────────────►│ Next.js route      ├───────────────►│ SQLite (Prisma)  │
│ /invoices/[id]│               │ getInvoiceReceipt()│               │ Invoice+Client   │
└──────┬───────┘               └────────┬───────────┘               └──────────────────┘
       │ Print                          │ props (pre-formatted strings)
       ▼                                ▼
┌──────────────┐               ┌────────────────────┐
│ Print CSS    │               │ InvoiceReceipt     │
│ @media print │◄──────────────│ (presentational)   │
└──────────────┘               └────────────────────┘
```

### Deep Module Decomposition & Seams

| Module / Seam | Public Interface / Boundary | Internal Complexity Hidden |
| :--- | :--- | :--- |
| **Receipt fetcher** | `getInvoiceReceipt(id: string)` in `src/actions/invoicing.ts` | cuid boundary check, Prisma include, `formatCents` mapping, null-on-missing |
| **InvoiceReceipt** | `<InvoiceReceipt invoice={...} />` in `src/components/InvoiceReceipt.tsx` | Receipt layout, line table, totals display; zero business logic |
| **PrintButton** | `<PrintButton />` in `src/components/PrintButton.tsx` | `window.print()` dispatch, focus-ring styling |
| **Print stylesheet** | `@media print` in `src/app/globals.css` | Chrome hiding (`.no-print`), light-ink forcing, `@page` margin |

Deletion test: removing `InvoiceReceipt` collapses all receipt layout into
the route (single coherent place, not scattered boilerplate) — kept separate
only because the route (server) and button (client) have different runtime
boundaries.

---

## 4. Detailed Design & Contracts First

### 4.1 Data Models & Schemas

No schema change. Reads existing `Invoice` + `Client` + `InvoiceLine`
(`prisma/schema.prisma`, M2 tables unchanged).

### 4.2 Zero-Downtime Migration Plan (Expand-Contract)

Not applicable — no migration, no new tables/columns, read-only feature.
Rollback is a plain revert of the uncommitted working set.

### 4.3 API Endpoints & Zod Contracts

No public API. One Server Action seam (UI never touches Prisma directly,
per `src/lib/invoicing.ts` convention):

```typescript
// src/actions/invoicing.ts
export async function getInvoiceReceipt(id: string) {
  // z.string().cuid().safeParse(id) → null on invalid
  // db.invoice.findUnique({ where: { id }, include: { client, lines } })
  // → null on missing (route calls notFound())
  // → { ...invoice, totalDisplay, subtotalDisplay,
  //      lines: [{ ...l, unitDisplay, lineDisplay }] }
}
```

Money: all displays via `formatCents` (integer cents, INV-02). No float math.

---

## 5. Security, Privacy & Failure Modes (FMEA)

### Security & Multi-Tenancy Audit

- Tenancy: N/A — single-owner local SQLite (INV-04); no auth boundary added.
- Input: route id validated with `z.string().cuid()` at the action
  boundary; invalid → `notFound()` (no stack leak).
- PII: receipt intentionally shows client name/email (owner's own data,
  local-only); nothing sent externally.

### FMEA Resilience Matrix

| Failure Scenario | Probability / Severity | Detection Method | Mitigation / Fallback | Recovery Strategy |
| :--- | :--- | :--- | :--- | :--- |
| Total mismatch (float) | Low / High | `bun test` + review | Render only pre-formatted `formatCents` strings; no client math | Fix mapper, rebuild |
| Unknown/invalid id | Medium / Low | Manual + smoke | cuid check → `notFound()` 404 | User returns to `/invoices` |
| Print spills nav/buttons | Medium / Low | Manual print preview | `.no-print` hiding + isolated `.print-receipt` | Adjust CSS, re-preview |
| Dark-mode ink unreadable on paper | Low / Medium | Print preview | `@media print` forces black-on-white | CSS-only fix, no data risk |

---

## 6. Conditional Implementation Milestones

TDD Enforcement Mode: `disabled` (default; no Task Record). Dependency-ordered
milestones, all complete uncommitted:

- [x] **M4.1 Receipt view + route**: `getInvoiceReceipt()`,
  `src/app/invoices/[id]/page.tsx`, `InvoiceReceipt.tsx` — server fetch,
  presentational render.
- [x] **M4.2 Print CSS + Print button**: `PrintButton.tsx`,
  `globals.css` `@media print`, `Receipt` link in `InvoiceList.tsx:89-96`.
- [x] **M4.3 Hardening + verify**: `bun test` 44/0 pass; `tsc` clean;
  `eslint` clean; `bun run build` green (10 routes incl. `ƒ /invoices/[id]`);
  smoke `:3000 /invoices` 200 (running server pre-dates M4; new route proven
  by build output).

### Sign-off Readiness

Milestones, acceptance (§2), review path (`pk:review` on request), and
verification condition above are recorded. This spec does not authorize
commits — `pk:commit` needs explicit approval.

---

## 7. Sign-off & Grilling Checklist

- [ ] Architecture challenged via `pk:grill` (optional for L1; not run).
- [x] Zero-downtime database evolution verified (N/A — no migration).
- [x] Non-goals agreed with stakeholder (browser-print choice approved).
- [x] Ready for disabled-Code-Work path (built, verified, uncommitted).
