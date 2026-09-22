# Database Token Rotation Plan — deadline 2026-12-21T13:07Z

<a id="RELEASE-db-token-rotation-2026-12"></a>

> **What this is:** a *plan* for a credential rotation on hosted Turso, drafted under `pk:ship` on
> 2026-09-23. **Nothing here has been executed.** No token, key, or credential value appears in this
> file — by design, since this repository is public.

- **Release ID [Required]**: `RELEASE-db-token-rotation-2026-12`
- **Canonical Record Path [Required]**: `docs/releases/2026-09-23-db-token-rotation-plan.md`
- **Release Linkage State [Required]**: `pending`
- **CI Triage Link [Required when a CI failure exists]**: `N/A - no CI failure`
- **Verification Link [Required]**: `[RUNBOOK-turso-2026-09-23](../rca/2026-09-23-turso-cli-token-invalidation.md#6-working-path-runbook)`
- **Verified Result [Required]**: `Pending` — this is a plan; the runbook it cites *was* proven on 2026-09-23 against the live database
- **Resume Condition [Required]**: window approved; execution now resumes **only** on creation of the Task Record (see Execution-Control Evidence), after which `ACTION-rot-002`..`004` may be confirmed separately.

- **Nature**: credential rotation, **not** a code release — no tag, no push, no version bump. It does include Vercel env writes and two redeploys, all human-executed.
- **Deploy Lead**: owner (Release Coordinator and sole approver)
- **Target Environment**: Vercel Production **and** Preview, plus local `.env`
- **Approved Window**: on or after **2026-11-21**, no later than **2026-12-01** — **approved by the owner 2026-09-23 (2026-09-22T16:03Z)**, recorded in `ACTION-rot-001`. Approval covers the *window only*; every execution block below stays `pending`.- **Commit SHA**: `N/A until execution — the plan lands on main in whichever commit carries it`

## Why this exists

| Fact | Source |
| :--- | :--- |
| Current token expires `2026-12-21T13:07:00+00:00` | STATE §7 machine-read blockquote, re-read 2026-09-23 |
| A daily CI guard fails when **14 days or fewer** remain (i.e. from **2026-12-07**) | `.github/workflows/db-token-expiry.yml` (`cron: "0 6 * * *"`) + `.github/scripts/check_db_token_expiry.py`, run 2026-09-23 → `89.9 days remaining, threshold 14d` |
| At expiry every DB-backed route fails and **no alerting announces it first** | STATE §7 blockquote |
| SQL-engine tokens are stateless JWTs — **rotation is the only revocation mechanism**; there is no per-token revoke | `docs/rca/2026-09-23-turso-cli-token-invalidation.md` §3 |

**Why that window.** The guard's alarm date (2026-12-07) leaves zero slack, and this operation costs
about a minute of measured downtime. Rotating from 2026-11-21 leaves ≥20 days of margin for a failed
attempt, and ≤30 days of new token lifetime before the *next* rotation becomes due (the current token
is bounded at 90 days; mint the replacement with `--expiration` again so the backstop stays).

## Execution runbook — ordering is forced, not stylistic

Proven end-to-end on 2026-09-23 against the live database: **63s** (rotate 1s · mint 4s · verify 6s ·
Vercel wiring 7s · redeploy `Ready` 52s), with `/login` still answering `200` to cookie-less requests
throughout.

0. **Stage first.** Confirm the exact Vercel env write and both redeploy commands are ready to run,
   because steps 2–4 must happen close together.
1. **Snapshot the current token.** Without a snapshot its death cannot be *proven* — this step was
   skipped on 2026-09-22 and that omission is why a failure went unnoticed.
2. **Rotate (kills every token for the database, immediately):**
   ```bash
   curl -X POST "https://api.turso.tech/v1/organizations/<org>/databases/<db>/auth/rotate" \
     -H "Authorization: Bearer <platform-api-token>"        # 200, no body
   ```
   Requires a scoped platform credential — the CLI's own `~/.config/turso/settings.json` token is
   **not** one (`api.turso.tech` rejects it). Mint with
   `turso auth api-tokens mint <name> --org <org> --group <group> --scope read --scope db:rotate-creds`.
3. **Mint AFTER rotating** (rotation invalidates tokens issued seconds earlier, including a new one):
   `turso db tokens create <db> --expiration 90d`, received on **stdout redirected to a temp file** — never argv, never chat.
4. **Wire both environments**, feeding values by stdin: `DATABASE_URL` + `DATABASE_AUTH_TOKEN` in
   **Production and Preview**; refresh local `.env` too (dev and test are unaffected either way — they
   are pinned to `file:./ledger.db`, verified by 13 resolver tests run 2026-09-23).
5. **Redeploy Production AND Preview.** Vercel applies env changes only to new deployments, and Preview
   is a separate deployment: redeploying only Production left Preview answering `500` on every
   DB-backed route for about an hour on 2026-09-23.
6. **Verify with probes that can fail** (table below), then **prove the snapshot returns `401`**.
7. **Revoke the platform credential** (`turso auth api-tokens revoke <name>`) — API tokens, unlike SQL
   tokens, are revocable.
8. **Record the new expiry**: STATE §5 narrative + the §7 blockquote's ISO date (the guard parses that
   exact line) → commit → push, so the guard re-runs on a runner and prints the new date.
9. **Delete the temp file holding the token.**

**Never use** `turso group tokens invalidate` / `turso db tokens invalidate` as the kill switch: the
`group` form reports `✔ Success!` while rotating a *different* signing key (same token probed `200` at
t+0s, t+12s, t+27s), and the `db` form is hard-blocked for grouped databases. Proof is the RCA §4 table.

## Post-deploy smoke verification

A probe that cannot fail is worse than no probe — this repo shipped two invalid ones for a week.

| Probe | Command | Expected | Meaning |
| :--- | :--- | :--- | :--- |
| DB reachable (page layer) | `curl -sI -H 'Cookie: ledgercraft_session=x' '<url>/journal?probe=x'` | bare `307 /login` | `validateSession()` **queried the database** and it answered |
| DB unreachable (negative control) | same, during an outage | `500` | `validateSession` has no try/catch and `resolveDatasource` throws — a failure cannot masquerade as a redirect |
| Middleware still armed | `curl -sI -H 'Cookie: ledger_session=x' '<url>/journal?probe=x'` | `307` → `/login?next=%2Fjournal%3Fprobe%3Dxyz` | wrong cookie name short-circuits in middleware; **this proves nothing about the database** — do not cite it as one |
| Cookie-less surface | `curl -sI '<url>/login'` | `200` | stays up even mid-rotation |
| Old token dead | probe the snapshot from step 1 | `401` | previously `200`; the death must be **proven**, not assumed |

Run every row against **Production and Preview**.

## Observation window (15 min) and rollback

- **Rollback criteria**: any DB-backed route returns `500` on Production or Preview after `Ready`, or
  the snapshot still answers `200` after rotation.
- **Reversal action**: there is no previous state to roll back to — rotation is irreversible by design.
  The reversal is always *forward*: re-mint (`turso db tokens create`) and re-wire; measured cost 4s + 7s
  + 52s redeploy. No database or schema action is involved (`N/A`), so Expand-Contract does not apply.
- **Abort point**: any failure **before** step 2 leaves everything untouched — abort and reschedule.
- **Accepted risk**: a short window where authenticated routes fail is unavoidable (the token dies at
  step 2 and Vercel only applies env on new deployments). Measured: 63s, `/login` up throughout.
- **Monitoring**: this project has **no error tracking** (no Sentry / Datadog / CloudWatch configured), so the
  observation window is manual probe re-runs plus the two post-rotation guard runs (push-triggered and
  the next daily cron). Record that limitation rather than implying automated coverage.

## Human-confirmation blocks (per `pk:ship`; pending = blocked)

| ID | Proposed action | Confirmation State | Approver / Timestamp | Scope | Reversal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ACTION-rot-001` | Choose and approve the execution window (proposed 2026-11-21 → 2026-12-01) | `confirmed` | owner, 2026-09-23 (2026-09-22T16:03Z), in-session decision on the `pk:ship` prompt | scheduling only — authorizes no execution step | window withdrawn |
| `ACTION-rot-002` | Mint the scoped platform credential, then call `auth/rotate` | `pending` | `N/A - awaiting confirmation` | one database, one call | re-mint DB token (step 3) |
| `ACTION-rot-003` | Write env vars and redeploy **both** Vercel environments | `pending` | `N/A - awaiting confirmation` | `DATABASE_URL` + `DATABASE_AUTH_TOKEN` × 2 envs | restore previous env values + redeploy |
| `ACTION-rot-004` | Revoke the platform credential and update STATE §7's ISO date | `pending` | `N/A - awaiting confirmation` | one API token + one tracker line | re-mint if needed; git revert |

No workflow, validator, or CI result executes any of these. A `pending` block stays blocked until the
owner records a separate confirmation, and confirming one block never authorizes another.

## Execution-Control Evidence (Optional per template; Recorded because Controlled Work applies)

- **Local Task Record**: `N/A - not yet created. **Required before execution begins** — a Level 3
  rotation needs a Task Record with scope, acceptance criteria and verification condition; creating it
  is part of the resume condition, not part of this plan.
- **Task ID / Specification**: `N/A - to be created at execution` / plan below
- **Execution Scope**: Vercel env vars (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`) in Production and
  Preview, local `.env`, Turso database token, STATE §5 and §7 records. **No application source change.**
- **Execution State**: `planned`
- **Owner / Approval Boundary**: owner / human-only for every step above — the agent plans and records; it does not mint, write env, redeploy, or revoke.
- **Acceptance Results**: `N/A - planning phase; acceptance criteria belong to the Task Record created at execution.`
- **Changed-File Summary**: this plan; `PROMPTKIT.md` profile refresh (separate commit).
- **Candidate Branch / Revision**: `main @ (set at execution; the plan commit is recorded in git)`
- **Verification and CI Evidence**: guard run locally 2026-09-23 (`89.9 days remaining, threshold 14d`); `bun test src/lib/datasource.test.ts` 13 pass / 0 fail (fail-closed behaviour on missing remote config); RCA §4 four-step reproduction on isolated infrastructure.
- **Review / Commit / Pull Request Evidence**: `N/A - no PR workflow; commits go to main directly.`
- **Latest Checkpoint / Handoff**: `docs/tasks/TASK-2026-09-18-hosted-libsql.checkpoint-01.md` (project close-out)
- **Scope Change / Exception Records**: `N/A`
- **Blockers and Resume Condition**: none blocking the *plan*; execution resumes on owner approval of `ACTION-rot-001` **and** creation of the Task Record.
- **Host / Timer Limitation**: no live timer or forced termination in this host; the deadline is enforced only by the daily CI guard, and the observation window is manual because no error tracking exists.
- **Release-Impact Evaluation**: no version/tag/public-contract change; the impact is one credential plus two redeploys. Preliminary status only — this is **not** an Approved Release Version, and nothing here authorizes a mint, env write, deploy, or revoke.

> Execution-control evidence supports durable traceability only. It does not authorize a tag, push,
> publication, deployment, rollback, or any other external action. Release Coordinator approval remains
> separate and human-only.
