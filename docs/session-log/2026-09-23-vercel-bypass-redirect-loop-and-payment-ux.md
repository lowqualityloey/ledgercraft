# Session log — 2026-09-23: deployment-protection bypass, a production redirect loop, and the payment acknowledgement

> **Extract, not a rewrite.** This narrative was one 7.7 kB cell in the Session Spend
> Ledger (`docs/STATE.md` §9), under the row label `2026-09-23 (Vercel protection-bypass
> rotation)`. It was moved here so the tracker's table stays readable; only the home and
> the formatting changed. `git log -p docs/STATE.md` still holds the original single-cell
> row, and §9 links back to this file. Nothing was dropped — the numbers, commit SHAs,
> deployment ids and method notes below are the ones recorded at the time.

## 1. Deployment-protection bypass rotated

The deployment-protection bypass secret had reached the transcript earlier in the session,
so it was rotated through the Vercel Platform API: `PATCH /v1/projects/{idOrName}/protection-bypass`
with `revoke.regenerate: true` — atomic, so there is no window where the project is
unprotected or has no valid secret.

- **No production impact**, because production sits on the custom domain that SSO
  protection excludes; the bypass only matters for the `*.vercel.app` Preview hosts.
- **Edge propagation characterised:** ~12 s to honour a newly minted secret, ~7 s to stop
  honouring a revoked one.
- **Revocation proved rather than assumed:** a throwaway bypass was minted, seen to bypass
  protection on a Preview host, revoked, and then seen to fail.
- Totals: **1 bypass rotated**, **1 throwaway minted then revoked**, no application code
  changed.

## 2. Quality gate re-run, because the baseline had gone stale

Switching from the Turso work to the bypass work left the test baseline unverified, so the
gate was re-run later in the same session:

| Check | Result |
| :--- | :--- |
| `bun test` | **75/75** — 161 `expect()` calls, 7 files, 7.17 s |
| `tsc --noEmit` | exit 0 |
| `eslint` | exit 0 |

Isolation was checked **before** running, not inferred afterwards: nothing exported,
`.env.test` pinning `file:./ledger.db`. It was then proven after the run — hosted
`Account` 15 / `User` 2 / `Session` 0 / `JournalEntry` 0 all unchanged, and the local
`ledger.db` mtime moved 01:16 → 01:59, i.e. the suite wrote locally, as designed.

**Method note.** One probe round reported production as 302/404/404 purely because the
wrong host was hardcoded. The real production host was already on record in §3A of the
tracker; the lesson is that a probe's target must be read from the record, not recalled.

**Verifier bug caught in the same run.** The post-run isolation check printed
`!! CHANGED` for values that were obviously identical (`before=15 after=15`). The cause
was libSQL returning counts as `{"type":"integer","value":"15"}` — the value is a
*string*, so `"15" != 15`. Re-run with proper coercion, all four tables were unchanged.
"I changed something" and "my verifier is broken" look identical from a summary line, so
the check was re-run rather than dismissed.

## 3. Vercel Development env scope — the premise was false

A request came in to remove a supposedly stale Development-scope `DATABASE_URL` pointing
at the retired `file:/tmp/ledger.db`. Measuring first changed the answer: it holds
`DATABASE_URL="file:./ledger.db"`, byte-identical to the committed `.env.development`, and
the other half of that risk was already contained (`.env.local` is gitignored,
`.gitignore:34`).

- **Kept**, by explicit decision, and the multi-day-stale warning in §5 corrected instead
  of acted on.
- **0 Vercel writes, 0 deletions** — the project's env surface was byte-identical before
  and after the turn.
- Scoping confirmed from the API: `target: [development]` only (`id=z5NYHZmnw0y67Vbt`), so
  Production and Preview carry their own values and nothing shared was ever at risk —
  deleting it *would* have been safe, it was simply unnecessary.
- **Method note:** the REST API will not decrypt a `sensitive` variable —
  `/v10/projects/{id}/env?decrypt=true` returned empty for it (a first read produced
  `len=0`). Pulling to a temp path is the only way to see what a pull actually writes,
  which is what disproved the warning.

## 4. A secret reached the transcript — mine

Inspecting that value meant printing the pulled file, and the `sed` masked only the
`DATABASE_URL` line — so the pull's own `VERCEL_OIDC_TOKEN` printed in full.

| | |
| :--- | :--- |
| Issued / expires | `2026-09-22T14:02:15Z` → **`2026-09-23T02:02:15Z`** (12 h TTL) |
| Scope | `project:ledgercraft:environment:development` |
| Rotatable? | No — minted per pull, no revoke endpoint; it self-expires |
| Who trusts it? | Nobody configured here: zero references to `VERCEL_OIDC_TOKEN` or OIDC anywhere in the repo, so no federation accepts it |

The lesson was recorded in §5 of the tracker: masking by **denylist** (hiding the key you
went looking for) fails the moment a command emits a secret you did not anticipate — mask
by **allowlist**, printing only key names or value *schemes*. This was the third secret to
reach a transcript in one session, and all three were avoidable the same way.

## 5. Production defect: `ERR_TOO_MANY_REDIRECTS`

A user report that the site was "not working" turned out to be a real application defect,
not a deployment problem.

- **Root cause:** `src/middleware.ts` computed `authed = Boolean(token)` — cookie
  *presence*, never *validity* — and bounced `/login` → `/`. The login page does its own
  check *after* validating via `getSession()`, so for a cookie whose session row was gone
  the two layers disagreed permanently: `/login` → `/` → `/login` → … The browser aborts
  that as `ERR_TOO_MANY_REDIRECTS`, and because the sign-in form itself was unreachable,
  signing in could not recover it — clearing cookies was the only escape.
- **Reproduced** as a 6-hop cycle against production before the fix.
- **Fixed** by deleting the middleware's redundant branch; the page's *validated* check is
  authoritative, since the edge runtime cannot read the database and must never act on
  cookie presence alone.
- **Pinned with 7 new tests** in `src/middleware.test.ts`, proven to fail against the old
  code (`Received: "/login -> /"`).
- **A weak test of my own caught mid-flight:** the first "loop" simulation *passed against
  the buggy middleware*, because it modelled the middleware only and never the page.
  It was rewritten to simulate both layers so it genuinely reproduces the cycle. A test
  that cannot fail proves nothing.
- **Real-runtime verification, all four cookie states:** stale cookie on `/` → `307 /login`
  → `200` rendered (was infinite); stale cookie on `/login` → `200` (was a bounce); no
  cookie and valid session both unchanged.
- **Shipped:** fix `6c7d964`, deployed as `db8dd2c` (which also carried a Next.js-generated
  agent-rules block that `next dev` wrote into `AGENTS.md`, committed as its own concern),
  build **31 s**, deployment `ledgercraft-pmnz3uy33` serving production. Guard run
  `35738765956` succeeded on the pushed SHA.
- **Second self-correction of the session:** the first live check reported `200 (rendered)`
  for every case, because Python's `urllib` **follows redirects by default** and so
  silently collapsed each chain. Re-run with redirects disabled, which is what produced the
  real chains above.
- **Production writes:** two ephemeral session rows used to render the signed-in app, each
  deleted in a `finally` block — hosted `Session` rows back to 0, as found.

## 6. README — corrected, then rewritten

`README.md` had gone **factually wrong**, not merely stale: it claimed the project **is
NOT git-connected** and that deploys happen only via the CLI, when every push to `main` has
been building and aliasing Production (the evidence: `d15d004`, `e6d528a`, `de3282f`,
`ae18570`, `3f8c55d`, `9d6f055`, `db8dd2c`, the last in 31 s). Anyone trusting that line
would have gone hunting for a CLI deploy that was not needed. It also carried a superseded
`75/75` test count and a dead deployment id.

Corrections, plus pointing the quick-start at the repo's own `bun run typecheck`, plus an
`Ops` table (gate commands, deploy path, the `2026-12-21T13:07Z` token deadline, the 14-day
CI alarm) and the two rules that bit this session:

1. the edge middleware may never infer auth from cookie *presence*; and
2. a credential rotation must redeploy **both** Production and Preview.

It was then **rewritten end-to-end in plain prose for a newcomer** — the compressed
shorthand expanded into sentences, with new sections for the enforced invariants, the
per-file test breakdown, the route list and the project layout. Every figure was re-derived
from the suite and a clean build rather than carried forward (82 tests across 8 files,
13 routes, 6 currencies, 7-day sessions, 6 migrations) and each was cross-checked against
the source it describes. One imprecision in the draft was corrected: it said everything
except `/login` and the webhook redirects unauthenticated visitors, but `/_not-found` is
not redirected either.

## 7. Two architecture walkthroughs, and the `?paid=1` gap they exposed

Both walkthroughs were verified line-by-line against the code, not written from memory.

- **How a journal entry gets posted** — form (`src/components/JournalForm.tsx`, which
  computes a live balance and keeps submit disabled until it balances) → server action
  (`createJournal`: `requireSession()` first, dollars → integer cents, fresh idempotency
  key) → domain (`postJournal`: `PostJournalSchema.parse` at **line 35**, account
  existence checks — all **before** the transaction that opens at **line 94**) → one
  `$transaction` creating the entry and its lines together → data access (`db.ts`, one
  Prisma client on the libSQL adapter).
- **How an invoice gets paid** — button → `createCheckout` → Stripe → webhook
  (`api/stripe/webhook/route.ts`, authenticated by **signature** over the raw body, since
  Stripe cannot hold a session) → `markPaid` (one transaction: **debit Cash, credit AR**,
  then `PAID` + `paymentEntryId`). The hard part is that Stripe redelivers events, so
  three independent idempotency guards must each absorb a repeat: the `StripeEvent` row
  written **before** any work, the already-`PAID` short circuit, and the ledger key derived
  from the event id (`` `stripe-${event.id}` ``).

Writing that second walkthrough surfaced a real gap: the `success_url`'s `?paid=1` was
**written but never read**. The parameter appeared in exactly one place in the whole `src/`
tree — `src/lib/stripe.ts:51`, where it is *written*. Nothing read it, so after paying, the
buyer was dropped back on the invoice with no acknowledgement. Not a ledger bug (the ledger was correct either way), but a real UX hole,
and the docs were amended to say so rather than softened to "cosmetic".

## 8. Payment acknowledgement shipped and verified on production

`src/components/PaymentConfirmation.tsx` plus a read of the parameter on the invoice page.
The design rule: the parameter is a **hint**, the stored status is the **truth**, so the
banner can never assert a payment the ledger has not recorded.

| Invoice status | What the buyer sees |
| :--- | :--- |
| `PAID` | "Payment received." + the invoice number + the ledger note |
| `UNPAID` / `VOID` | "Confirming your payment — this page will update on its own." (re-checks 3× at 2 s, then offers a Refresh button and stops claiming it will update) |

Verified in a live dev run against a **copy** of the dev database across all four cases —
no parameter, `?paid=1` while unpaid, `?paid=1` on a void invoice, `?paid=1` once paid —
where flipping the *copy's* status was also what proved which database the server was
reading; the real `ledger.db` was never touched.

Then shipped and verified **on production itself**: commit `5d4c9ca`, deployment
`ledgercraft-rj9lprl94`, built in ~31 s. `/invoices/<id>?paid=1` on the paid invoice
returned the success banner naming INV-0001; the same URL without the parameter rendered
no banner; the container carries `no-print` so printed receipts are unaffected.
Production writes were one ephemeral session, inserted for the probe and deleted in a
`finally` (hosted sessions 1 → 2 → 1, the owner's own session untouched).

## 9. The pending branch, verified on production with a throwaway invoice

That path had rested on the local copy verification, which is weaker than it looked. It was
closed properly instead of left inferred:

- One throwaway `UNPAID` invoice was **created on production and removed again**:
  `PKTEST-UNPAID-01`, `$123.45`, client `Equiparco`, written via `postInvoice`.
- The one-off script **failed closed** unless the resolved datasource was
  `libsql://*.turso.io`. This was not hypothetical: the first attempt loaded
  `.env.development` (which bun auto-loads) and correctly refused to run, printing
  `target: file:// -> NOT hosted` — i.e. it would otherwise have written to the local file
  DB while reporting success.
- Probed live through the public URL with an ephemeral session, then deleted in a single
  transaction — **invoice line → invoice → journal lines → issue entry**, in that order,
  because every relation in the schema is `onDelete: Restrict`.
- **14/14 live assertions passed:** `?paid=1` while `UNPAID` renders "Confirming your
  payment" with the amber treatment, offers Refresh and carries `no-print`, while asserting
  the *absence* of both success phrasings; the same page without the parameter renders no
  banner at all; and the real `PAID` invoice still renders the green success banner, so the
  pending result cannot be explained by the banner being broken. `/invoices` listed the
  probe as `UNPAID` while it existed.
- **Hosted state then matched the pre-probe baseline exactly:** `Account` 15 / `User` 2 /
  `Session` 1 / `Client` 1 / `Invoice` 1 / `InvoiceLine` 3 / `JournalEntry` 2 /
  `JournalLine` 4, zero `PKTEST` rows left, ledger sum `debit = credit = 205272800`
  unchanged — so production carries no residue from the probe.
- **Method note:** one live assertion first reported a false FAIL because React emits
  `<!-- -->` between `{number}` and the static text after it, so `"INV-0001 is marked paid"`
  never exists as one contiguous string. The checker was wrong, not the page. Assertions on
  server-rendered React must match static fragments rather than phrases that span an
  interpolation.

## 10. Gate re-measured at the session's end state

`bun test` **82/82** with **170 `expect()` calls** across 8 files — identical across three
consecutive runs — plus `tsc --noEmit` exit 0 and `eslint` exit 0.

The `175 expect()` figure that appeared in this record earlier was measured against the
pre-rewrite `src/middleware.test.ts`; it was removed rather than left standing, since 170 is
the current, reproducible number.

## 11. What remained unverified

- The **client-side auto-recheck timer** (2 s × 3) and its "gave up" message both need a
  browser, and this environment has none. The server-rendered states they depend on are
  verified; the timer itself is only reasoned about.
- The pending branch *was* verified live, but only against a temporary invoice that has
  since been deleted — so the evidence is this log and the tracker, not a durable record in
  production.
