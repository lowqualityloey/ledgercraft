# Review — execution-control record cleanup (2026-09-23)

**Scope:** `docs/tasks/**` and `docs/STATE.md`, no application code.
**Trigger:** the PromptKit execution-control validator reported **118 diagnostics** across
9 records. It now reports **`VALID|RECORDS=15`** — 0 diagnostics — verified in this turn.

## 1. What was actually wrong

Almost none of the 118 were disagreements about what happened. They were **parser contract
violations**: the validator reads labelled cells, table cells and profile values *verbatim*,
and prose, backticks or notation in the wrong place silently turned correct records into
invalid ones. Three mechanisms accounted for the bulk:

| Mechanism | Effect | Example |
| :--- | :--- | :--- |
| Prose inside a `- **Label**: value` cell | the whole rest of the line becomes the value | `` `none` (legacy dated ID preserved) `` parsed as an unknown adaptation profile (5 records) |
| Backticks around a state token | the cell never matches an allowed transition edge | `` `N/A` -> `planned` `` vs the graph's `N/A:planned` (22 findings) |
| A table that isn't state history | every `\|` line in a record is read as a transition | an "Atomic breakdown" table produced `ID -> Task (1–4h)` (8 findings) |

Two further classes were real record defects rather than formatting: a state projection whose
four compared cells were compared against fields the Task Record never had (**§3A was
disagreeing with an empty string**), and two transition histories that jumped `planned` →
`completed` while claiming to be complete.

## 2. Before → after, measured each step

| Stage | Diagnostics |
| :--- | ---: |
| Session-ledger row was one 7.7 kB table cell | 118 |
| Row extracted to `docs/session-log/`; the stray blank line that orphaned 5 rows removed | 113 |
| hosted-libsql projection reconciled with its Task Record (fields, state, transitions) | 75 |
| Adaptation-profile cells reduced to bare values | 70 |
| Transition histories: bare tokens, legal edges, no non-transition tables | 38 |
| Completion-evidence and host-timer cells made to say what they mean | 19 |
| Scope deviation recorded and the two handoffs closed | 15 |
| Scope-boundary classification recorded (this commit) | **0** |

## 3. Commits

| Step | Change |
| :--- | :--- |
| Ledger row extraction | Moved the 7.7 kB Session Spend Ledger row into `docs/session-log/2026-09-23-vercel-bypass-redirect-loop-and-payment-ux.md`, leaving a summary that links to it; removed the stray blank line that orphaned five table rows |
| Projection reconciliation | Reconciled §3A with `TASK-2026-09-18-hosted-libsql`: added its missing state, ownership, policy and completion fields plus a legal transition history, and made the projection's compared cells pure values |
| Adaptation-profile cells | Five records: the adaptation-profile cell is now `none` alone, with the legacy-ID note moved to the blockquote beneath it |
| Transition histories | Transition histories: bare state tokens, core-ledger routed through `ready`, two histories extended to `completed`, and the one non-transition table re-expressed as a list |
| Completion evidence and timers | Six records: `CI Evidence` and `Review Evidence` state why there is no artifact instead of a bare `N/A`; `Host Timer Capability` names the enforcement limitation; core-ledger's bracketed `[completed]` becomes the value the completion gate compares |
| Scope deviation and handoffs | `SCOPE-2026-09-18-hosted-libsql-01` records the two files that genuinely shipped outside that task's scope; both handoffs state that no acceptance occurred rather than leaving `n/a` |
| Boundary classification | Five Scope Change Records for the remaining boundary findings, linked from their Task Records — see §4 |

These ran as seven commits and were then squashed into a single cleanup commit at review time, together with the tracker log entry. The pre-squash commits are retained locally on the branch `backup/pre-squash-2026-09-23`.

## 4. Classification of the scope-boundary findings

All 17 findings were read against each record's **In Scope** text and its own plan. Every one
is a path the plan covered but did not name literally — **no finding turned out to be an
unplanned addition**. Nothing was hidden by this: each record's `Changed Files` list still
names every path, and the plan text was **not** rewritten to match.

| Record | Findings | Classification |
| :--- | ---: | :--- |
| core-ledger | 5 | `package.json`, `prisma7.config.ts`, `src/lib/db.ts`, `src/app/*`, `.env.example` — the scaffold its own breakdown planned as T1, never enumerated; In Scope also wrote `lib/money.ts` without the `src/` prefix |
| invoicing | 5 | generated migration for the planned schema change; the plan put tests in `tests/` where they don't live (`src/lib/invoicing.test.ts`); "Server Actions" and the `/clients` UI planned without paths; `src/app/clients/**` is a glob that doesn't contain `src/app/clients/page.tsx` |
| multi-currency | 2 | plan named the migration *directory*, not the file; `InvoiceReceipt.tsx` was listed with a shared prefix rather than a full path |
| auth-multi-user | 2 | generated migration for the planned `User`/`Session` change; the plan named `LogoutButton` by symbol only |
| stripe | 1 | generated migration for the planned Stripe columns |

**Why records rather than editing the plans.** The validator's own remediation is "link an
approved Scope Change Record or keep the change within scope". Editing five historical In
Scope lists would have made the plans match today's file layout — a retrospective rewrite of
a planning artifact. A record states the observation without altering the plan, so a reviewer
can still see that the plan was coarse. Both options were on the table; this one is reversible
and asserts less.

**What the records deliberately do not claim.** `Decision` is `Accepted retroactively`, not
`Approved`: no scope approval was sought at the time, and naming an approver would invent a
governance event. Each record says so explicitly, cites the milestone acceptance that *did*
happen, and notes it was created on 2026-09-23.

## 5. Verification relied on

| Claim | Evidence (all run in this cleaning session) |
| :--- | :--- |
| Validator clean | `validate-execution-control.sh` → `VALID\|RECORDS=15\|ROOT=.`, exit 0 |
| No new diagnostic types at any step | each step diffed against the previous run's output |
| Token expiry guard unaffected | `check_db_token_expiry.py` exit 0, `89.9 days remaining, threshold 14d`, unchanged throughout |
| No secrets introduced | every commit's added lines scanned for JWTs, libsql URLs, Turso hosts, Stripe keys, webhook secrets, 32+ char runs and credential assignments — all zero |
| Application untouched | no file under `src/`, `prisma/` or the configs was modified; the test suite was therefore not re-run for these documentation commits |

## 6. Revision convention adopted here

`Branch / Revision` names the task's **own final commit**, not the last commit that happened to touch its
file. The distinction is real in this repository: M2's record was amended afterwards by M3's planning
commit (`bcf62fa`) and M3's record by the 2026-09-22 archival commit (`cf271cf`) — both are other
work crossing the file, so neither is that task's revision. Where a task has both a product commit and
a later milestone close-out, the close-out wins (`edb4f30` over `df3b5de`, `98b44cc` over `476437b`,
`d83073c` over `d1a1a92`); where the plan and the build differ, the build wins (`539de27` over
`bcf62fa`).

Scope note, since it is easy to over-read these fields: the validator compares §3A's *one* `Task ID`
against that record's revision. Filling the other six records therefore adds provenance and prepares
the check for the next task projection — it does not widen coverage today. Verified by re-pointing
§3A at each task in a throwaway docs root: `VALID` when the revision agrees, `REVISION_MISMATCH`
naming that task when it does not.

## 7. Known remaining items (not part of this cleanup)

1. ~~**Strict mode reports 2**: two 2026-09-17 checkpoint snapshots carry no `Record Type`.~~
   **Resolved 2026-09-23**: both were promoted to full Checkpoint Records with their own
   `Checkpoint ID`, type, resume condition and recorded-by fields, so `validate-execution-control.sh`
   now reports `VALID` in default *and* strict mode (17 records, up from 15).
2. ~~**§3A's `Current Revision`** is `56c1cd4` while that task's newest commit is `398b24e`.~~
   **Resolved 2026-09-23**, with a correction to the claim above: that task's *last* commit is not
   `398b24e` but `b1ddc0f` (*docs(env): record local dev/test isolation and post-rewrite SHAs*).
   `398b24e` is the earlier completion commit, which re-queued the isolation item rather than
   performing it; the docs had credited the follow-up to it. §3A now carries `b1ddc0f`, and the
   Task Record gained `Branch / Revision: main @ b1ddc0f` — which turns the previously inert
   `REVISION_MISMATCH` check into an active, passing one. Verified non-vacuously: with the record
   in a throwaway docs root set to `56c1cd4`, the validator emits `REVISION_MISMATCH
   TASK-2026-09-18-hosted-libsql`, so the agreement is real rather than an unchecked field.
3. **A second worktree** (`.kilo/worktrees/stone-squash`, excluded via `.git/info/exclude`)
   still holds the pre-cleanup copies of these records. It will need a merge or rebase.
