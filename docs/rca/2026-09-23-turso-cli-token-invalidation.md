# RCA: `turso group tokens invalidate` reports success while invalidating nothing

- **Date**: 2026-09-23
- **Severity**: High for credential hygiene — a security-relevant command reports success while doing nothing
- **Status**: Root-caused; workaround applied to this repo; upstream report prepared (see §7)
- **Affects**: `turso` CLI v1.0.32 (latest release, 2026-08-17) · Linux/WSL2 x86_64 · any Turso database that belongs to a group (i.e. every database created via the CLI)

---

## 1. Summary

`turso db tokens invalidate <database>` cannot be used on a database that belongs to a group: it
refuses to run and redirects the caller to `turso group tokens invalidate <group>`. The group command
then prints `Success! Tokens invalidated successfully.` while leaving the database's tokens fully
valid. Net effect: **the CLI has no working path to invalidate database tokens**, and the success
message actively misleads — the operator believes a credential surface was closed when nothing changed.

## 2. Impact in this repository

This defect caused a real, damaging outcome during the 2026-09-22 credential rotation:

1. A rotation was planned as `mint → wire → invalidate`, which is impossible anyway (see §5), so the
   ordering had to change mid-flight.
2. The invalidation step then appeared to succeed. Because it silently did nothing, **seven database
   tokens remained live**, including `d63c8255868a` minted during the 2026-09-18 migration from a
   platform token that had leaked through chat.
3. The live-credential surface therefore grew *wider* than before the rotation, which is the exact
   opposite of the intent, and the false success meant the failure was not noticed for a full session.
4. It also produced a wrong conclusion in this repo's tracker — that database tokens were
   "non-revocable" — which was itself incorrect (§5).

Closed 2026-09-23 by using the Platform API instead (§6): the pre-rotation token was snapshotted first
and returned `401` one second after the rotate call, so all seven tokens are now verifiably retired.

## 3. Root cause

Database tokens and group tokens are signed by **different keys**:

- `turso db tokens create <db>` issues a token signed by the **database** signing key.
- `turso group tokens create <group>` issues a token signed by the **group** signing key.

`turso group tokens invalidate <group>` rotates the **group** key. That does not affect tokens already
signed by a *database* key, so it is a no-op for the everyday case of a database token created with
`turso db tokens create`. The command reports unqualified success regardless, because the API call it
makes succeeds — the CLI reports transport success, not the outcome the user asked for.

`turso db tokens invalidate` is the command that *would* target the right key, but it is hard-blocked
for grouped databases and redirected to the wrong one. The Platform API route that does work,
`POST /v1/organizations/{org}/databases/{db}/auth/rotate`, has no CLI equivalent.

## 4. Evidence (measured 2026-09-23, isolated group/database — no production involved)

Setup: throwaway group `pk-probe-group` + database `pk-probe-db`, token `5b33ce71171b`.
Baseline and negative control: valid token `200`, forged token `400`.

| # | Action | Observed |
| :--- | :--- | :--- |
| A | `turso db tokens invalidate pk-probe-db -y` | `Error: database pk-probe-db is part of group pk-probe-group, use turso group tokens invalidate <group-name> instead` |
| B | `turso group tokens invalidate pk-probe-group -y` | `✔ Success! Tokens invalidated successfully.` |
| C | probe the **same** token after B | `200` at **t+0s, t+12s, t+27s** — never invalidated |
| D | `POST /v1/organizations/<org>/databases/pk-probe-db/auth/rotate` | `200`, then the same token → **`401`** |

D is the decisive step: the *same* database and the *same* token were revocable — the group rotation
simply targets the wrong key. So this is a wrong-lever/CLI-gap defect, **not** a platform limitation.

All probe resources were destroyed afterwards (`db destroy`, `group destroy`, API token revoked), with
`turso db list` / `group list` / `auth api-tokens list` verified back to their pre-experiment state.

### Documented expectation, for contrast

- `turso group tokens invalidate --help`: *"Rotates the keys used to create and verify database tokens,
  invalidating all existing tokens invalid for the group."*
- `turso db tokens invalidate --help`: *"Rotates the keys used to create and verify database tokens
  making existing tokens invalid"*.
- <https://docs.turso.tech/sdk/authorization/tokens>: *"You can invalidate all existing tokens for a
  database or group, which rotates the signing keys"* — listing `turso db tokens invalidate
  <database-name>` as the database-scoped form.

By any reading, C contradicts the expectation set by B's own success message.

## 5. Two corrections to earlier conclusions in this repo

- **"Database tokens are non-revocable."** Wrong. They are revocable via the database-level rotate;
  the CLI just cannot reach it. Recorded correctly in `docs/STATE.md` §5.
- **"`invalidate` returns before doing anything, so there is no outage risk."** Only true for the
  `db`-scoped form (it errors). The `group` form does execute and rotate the group key.

## 6. Working path (runbook)

```bash
# 0. You need a platform credential. The CLI's own ~/.config/turso/settings.json `token` is NOT one
#    (api.turso.tech rejects it: "token contains an invalid number of segments"), so mint a scoped one:
turso auth api-tokens mint <name> --org <org> --group <group> --scope read --scope db:rotate-creds

# 1. Snapshot the CURRENT token first -- otherwise you cannot prove it died.
#    (This step was skipped on 2026-09-22 and that omission is why the failure went unnoticed.)

# 2. Rotate, then mint, then wire, then redeploy, then verify:
curl -X POST "https://api.turso.tech/v1/organizations/<org>/databases/<db>/auth/rotate" \
  -H "Authorization: Bearer <api-token>"          # 200, no body
turso db tokens create <db> > .env.new-token      # mint AFTER rotating: rotation kills it otherwise
# wire via stdin (never argv), redeploy, verify, then confirm the snapshot now returns 401

# 3. Revoke the platform credential -- API tokens, unlike SQL tokens, ARE revocable:
turso auth api-tokens revoke <name>
```

Ordering is forced: rotation invalidates **every** token issued for the database, including one minted
seconds earlier, and Vercel only applies env changes to new deployments — so a short window of failing
authenticated routes is unavoidable. Measured for this app: **63s** end-to-end (rotate 1s, mint 4s,
verify 6s, Vercel wiring 7s, redeploy `Ready` 52s), with `/login` static throughout.

## 7. Actions

| # | Action | Owner | Status |
| :--- | :--- | :--- | :--- |
| 1 | Apply the working rotation to `ledgercraft`; retire all 7 stale tokens | Assistant | Done 2026-09-23 (`a09d0413229e` live) |
| 2 | Record the correct mechanism + runbook in `docs/STATE.md` §5 | Assistant | Done |
| 3 | Report the no-op to Turso upstream | Assistant | Report prepared (below), **awaiting go-ahead to file publicly** |
| 4 | Re-check `turso group tokens invalidation` behaviour after any CLI upgrade | Anyone | Open |
| 5 | Consider `--expiration` on future database tokens so a stranded token self-expires | Anyone | Open — recommended |

Item 5 is the real lesson: because rotation is the *only* revocation mechanism for SQL tokens, a token
minted with the default `-e never` that outlives its rotation plan has no backstop. Prefer a bounded
expiry so an unnoticed failure self-heals.

---

## Appendix: upstream report prepared for filing

Target: `tursodatabase/turso-cli` (issue #452, *"Invalidating individual database tokens?"*, is related
and adjacent — it requests per-token revocation and states that group-level invalidation is the
supported path, which §4 shows is not true for grouped databases).

<!-- BEGIN FILED REPORT -->
### `turso group tokens invalidate` reports success but does not invalidate database tokens

**Summary**

For a database in a group, `turso db tokens invalidate <db>` refuses to run and redirects to
`turso group tokens invalidate <group>`. That command prints `Success! Tokens invalidated
successfully.` but leaves the database's tokens valid. There is therefore no working CLI path to
invalidate database tokens, and the success message is a false positive on a security-relevant
operation.

**Environment**

- `turso` CLI v1.0.32 (current latest release, 2026-08-17)
- Linux 6.18.33.2-microsoft-standard-WSL2, x86_64
- `starter` plan; database in group `default`

**Steps to reproduce** (isolated — throwaway group and database)

```bash
turso group create repro-group -w
turso db create repro-db --group repro-group -w
turso db tokens create repro-db > token.txt

# baseline: the token authenticates
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $(cat token.txt)" \
  -X POST "https://<db-host>/v2/pipeline" -H 'Content-Type: application/json' \
  -d '{"requests":[{"type":"execute","stmt":{"sql":"SELECT 1"}},{"type":"close"}]}'
# -> 200

turso db tokens invalidate repro-db -y
# -> Error: database repro-db is part of group repro-group,
#    use turso group tokens invalidate <group-name> instead

turso group tokens invalidate repro-group -y
# -> ✔  Success! Tokens invalidated successfully.

# re-run the probe with the SAME token
# -> 200 at t+0s, t+12s and t+27s; it is never invalidated
```

**Expected**

Per <https://docs.turso.tech/sdk/authorization/tokens> — *"You can invalidate all existing tokens for
a database or group, which rotates the signing keys"*, listing `turso db tokens invalidate
<database-name>` as the database-scoped form — and per the group command's own help text
(*"invalidating all existing tokens invalid for the group"*), the rotation should retire the tokens for
the group's databases.

**Actual**

The group rotation has no observable effect on tokens created with `turso db tokens create`.

**The tokens are revocable — the CLI just cannot reach the call that does it**

Immediately afterwards, on the *same* database with the *same* token:

```bash
curl -X POST "https://api.turso.tech/v1/organizations/<org>/databases/repro-db/auth/rotate" \
  -H "Authorization: Bearer <platform-api-token>"
# -> 200, and the same token now returns 401
```

So rotating the *database* signing key retires these tokens instantly (no propagation delay observed),
while the CLI's group rotation does not. The likely defect is the redirect: `db tokens invalidate`
refuses to run for a grouped database and sends the caller to a command that rotates a different key,
with no CLI equivalent of the database-level `/auth/rotate` endpoint.

**Notes / where I may be wrong**

I understand `invalidate` may be intended to rotate only the *group* key, affecting only group-issued
tokens. If that is the intent, then the help text and the docs page above are what mislead, since both
describe database tokens being invalidated. Either way, emitting `Success!` for a no-op is worth
fixing, because it is exactly the signal an operator relies on to confirm a credential was revoked.

Also noting that SQL-engine tokens appear to be stateless JWTs with no server-side record, so a
per-token revoke (#452) may not be possible by design — key rotation being the only mechanism is
reasonable. The actionable part here is the false success and the unreachable working endpoint.
<!-- END FILED REPORT -->
