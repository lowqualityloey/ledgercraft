# Project Close-Out — LedgerCraft (2026-09-23)

This is the closing record for the LedgerCraft build. It states what shipped, what the final state was
measured to be on the day of close, what was *not* verified, and what remains true after the project is
closed. Written under `pk:checkpoint` Phase 4; the durable state lives in `docs/STATE.md`, and the
per-task authorities remain their Task Records.

**Status: COMPLETED** — every milestone in the roadmap is closed and the product is deployed.

## 1. What shipped

| Milestone | Scope | Closed |
| :--- | :--- | :--- |
| M0 | Phase 0 intake — MVP floor, Later ledger, invariants locked | 2026-09-17 |
| M1 | Core ledger: chart of accounts, balanced journal, Trial Balance, P&L | 2026-09-17 |
| M2 | Clients + accrual invoicing with auto-posting | 2026-09-17 |
| M3 | Bank CSV import with drafts, balanced posting and dedup | 2026-09-17 |
| M4 | Invoice PDF receipts (browser print CSS, no new dependencies) | 2026-09-17 |
| M5 | Auth / multi-user accountant login in front of a shared ledger | 2026-09-17 |
| M6 | Multi-currency foreign invoices, base USD, integer `convertCents` | 2026-09-17 |
| M7 | Stripe Checkout + webhook, hosted, idempotent event handling | 2026-09-17 |
| M8 | Hosted libSQL persistence (Turso), local dev/test isolated | 2026-09-18 |

Each milestone has a Task Record under `docs/tasks/` carrying its acceptance results and commit
evidence; the records validate clean against the execution-control validator.

Two things happened after M8 that belong to the close rather than to a feature: the two 2026-09-17
checkpoint snapshots were promoted to full Checkpoint Records (strict-mode validation had been skipping
them), and the execution-control records were taken from 118 validator diagnostics to zero. Both are
summarised in `docs/reviews/2026-09-23-records-validation-cleanup.md`.

## 2. Final state, measured on 2026-09-23

Everything in this table was executed in the close-out pass, on commit `7a60060`:

| Check | Result |
| :--- | :--- |
| `bun test` | **82 pass / 0 fail**, 170 `expect()` calls across 8 files, 4.90s |
| `npx tsc --noEmit` | exit **0** |
| `npx eslint .` | exit **0** |
| `bun run build` | exit **0** — 13 routes; `/invoices/[id]` and the proxy still dynamic |
| Execution-control validator | `VALID` in **default and strict** mode |
| Token-expiry guard (local) | `OK: recorded expiry 2026-12-21T13:07:00+00:00, 89.9 days remaining, threshold 14d` |
| Token-expiry guard (GitHub runner) | **success** at `7a60060`, same numbers |
| Working tree | clean; `main` level with `origin/main` |

Production, probed live with redirects **disabled** so the responses are the server's own:

| Route | Result |
| :--- | :--- |
| `/login` | `200` |
| `/` | `307` → `/login?next=%2F` |
| `/journal` | `307` → `/login?next=%2Fjournal` |

## 3. What was not verified — stated rather than implied

- **No test or build pipeline exists in CI.** `.github/workflows/` holds the daily token-expiry guard
  and nothing else. Every green gate above is a local run; nothing re-runs `bun test` on push.
- **Browser-only behaviour is not machine-verified.** The payment-confirmation banner's client-side
  recheck (3 attempts at 2s, then a Refresh button) and its "gave up" message need a browser; this
  environment has none. The server-rendered states they depend on *were* verified, locally on a copy of
  the dev database and live on Production.
- **The pending-confirmation branch was exercised on Production only once**, with a throwaway invoice
  (`PKTEST-UNPAID-01`) created and removed in a single transaction, with all counts returned to their
  pre-probe baseline.
- **Preview requires a protection bypass.** Vercel deployment protection sits in front of Preview, so
  Preview reachability can only be confirmed through the rotated bypass secret. Preview is also a
  separate deployment that Vercel does not re-deploy on env change — which is exactly how it was once
  silently broken after a credential rotation.

## 4. Deferred, not backlog

These were considered, deliberately not built, and are the natural next milestones if the project
reopens:

- **Stripe live keys cutover** — the product runs on Stripe test keys; the webhook path is exercised.
- **FX revaluation** — FX is posted per invoice at the stored rate; no period-end revaluation.
- **CSV multi-currency** — imports assume base USD.
- **Row-level tenant isolation** — auth is a shared-ledger gate, not per-tenant isolation; recorded as
  `INV-04`'s deferral with the trigger condition that would force it (accountant read-only access).

## 5. What outlives the close

| Item | Why it matters | Where it is tracked |
| :--- | :--- | :--- |
| **Database token expires `2026-12-21T13:07Z`** | After that instant every DB-backed route fails with no alerting; the token has a bounded 90-day expiry by design | STATE §7 blockquote; the daily guard parses that same line and fails inside 14 days |
| Preview is behind deployment-protection SSO | A rotated credential can leave Preview broken without Production showing it | STATE §5; the Preview caveat in this record |
| `review/m7` branch | One unmerged commit (`9a0ce7c`) that the hosted-libSQL migration superseded; harmless but it is the only reference to unmerged work that is not the owner's | STATE §7 item 8(c) |
| `.kilo/worktrees/stone-squash` | Another agent's worktree at `46a2c83`, excluded from tracking; it holds pre-cleanup copies of these records | STATE §7 item 8(c) |

## 6. Where the evidence lives

| Question | Artifact |
| :--- | :--- |
| Current state, risks, queued items | `docs/STATE.md` (§3A is the execution-control projection) |
| What each milestone was and how it was accepted | `docs/tasks/TASK-*.md` |
| Scope deviations and their disposition | `docs/tasks/SCOPE-*.md` |
| Session narrative, including the credential work | `docs/session-log/`, STATE §8–§9 |
| The records cleanup, 118 → 0 diagnostics | `docs/reviews/2026-09-23-records-validation-cleanup.md` |
| Hosted persistence design and the Turso migration | `docs/specs/2026-09-18-spec-hosted-libsql.md` |
| This close | `docs/releases/2026-09-23-project-closeout.md`, `docs/tasks/TASK-2026-09-18-hosted-libsql.checkpoint-01.md` |

## 7. Resuming after close

Reopening this project does not need chat history. Read `docs/STATE.md` §1 and §7 first, then the Task
Record for whatever is being touched, and re-run the gate before trusting any historical figure in this
document — including its own. The one date that will eventually force action without anyone reading
anything is the token deadline in §5, which is why a machine checks it daily rather than a human
remembering it.
