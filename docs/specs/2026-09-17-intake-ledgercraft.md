# Intake Record — LedgerCraft (2026-09-17)

- **Project:** LedgerCraft — double-entry bookkeeping engine for freelancers / small businesses
- **Size:** `medium` (web UI + data store, solo maintainer, local-only MVP; suggested, accepted via persist approval 2026-09-17)
- **Close reason:** `human_stopped` ("Enough for now" after Round 1)
- **Unknown slots:** Slot 7 partial (deadline/budget/compliance = none assumed); Slot 5 (no artifacts — N/A greenfield)

## 7-slot coverage

| # | Slot | Status | Answer / Assumption |
|---|------|--------|---------------------|
| 1 | Outcome + MVP floor | answered | Manual Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses) + manual Journal Entry form (Date, Description, Debits, Credits with sum validation) + Trial Balance + basic P&L. User quote: "Manual Chart of Accounts + manual Journal Entry form + Trial Balance and basic P&L report." |
| 2 | Users + success | answered | Solo freelancer only Phase 0. Success: "I can post an expense and client payment, and the Trial Balance mathematically balances." |
| 3 | Surfaces | answered | Local web UI + local data store (SQLite `ledger.db`) via Server Actions. No separate public API, no background jobs, no auth in MVP. |
| 4 | Deployment | answered | Local-only (`bun dev`). No hosted target for Phase 0. |
| 5 | Existing artifacts | assumed N/A | Greenfield — no ARCHITECTURE.md / STYLE.md / DESIGN.md / board links provided. |
| 6 | Design inputs | answered | Agent defaults accepted: clean Tailwind dark/light UI, monospace numbers for currency, readable tables. No Figma. |
| 7 | Constraints | answered + assumption | Stack locked: Next.js TypeScript + SQLite/Prisma + bun. Deadline/budget/compliance: `ASSUMPTION-01` none. |

## Minimal Chart of Accounts (proposal for pk:plan to lock)

- **Assets:** 1000 Cash/Bank, 1200 Accounts Receivable, 1500 Equipment
- **Liabilities:** 2000 Accounts Payable, 2100 Credit Card Payable
- **Equity:** 3000 Owner Capital, 3100 Owner Draw, 3900 Retained Earnings
- **Revenue:** 4000 Client Income, 4900 Other Income
- **Expenses:** 5000 Rent, 5100 Software, 5200 Supplies, 5300 Travel, 5900 Misc

## Decisions defaulted (accepted 2026-09-17 via option 1)

1. Stack: `bun + Next.js App Router (TS strict) + Prisma + SQLite ledger.db + Tailwind` — 2026-era default, matches constraint.
2. Data-fetching: Server Actions + Prisma directly (no separate API) for local-only simplicity.
3. Money: integer minor units (cents) + BigInt/INT in DB, Zod boundary validation, monospace display.

## Later ledger (explicitly out of MVP)

Invoicing, clients, PDF receipts/generation, bank CSV imports, auth/multi-user + login, multi-currency auto-conversion, Stripe webhooks. Cost if pulled into MVP: each adds ≥1 surface + auth/data boundary — requires re-plan.

## Assumptions (owned)

- `ASSUMPTION-01` — No deadline/budget/compliance limits. Impact-if-wrong: low for local MVP; blocks `pk:ship` if residency/audit appears. Owner: user. Validate: confirm before release.
- `ASSUMPTION-02` — No pre-existing docs/design system. Impact-if-wrong: low. Owner: user. Validate: link docs if they appear.
- `ASSUMPTION-03` — Size `medium` accepted via persist approval (not explicit "medium" utterance). Impact-if-wrong: low. Owner: user. Validate: downgrade to `small` in `pk:plan` if single-surface holds.

## Attachments / links

None received (host readable — nothing provided).

## Authority

Intake answers + unknown list live here. `PROMPTKIT.md` holds projection (`size:`, `intake-status:`). Architecture/contracts live in future `pk:plan` spec. Execution authority will be `docs/tasks/`. `docs/STATE.md` is projection owned by `pk:checkpoint`.
