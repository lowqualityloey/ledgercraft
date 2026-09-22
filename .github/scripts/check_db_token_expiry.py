#!/usr/bin/env python3
"""Fail loudly when the production database token is close to expiry.

The token authenticating Production and Preview to the hosted libSQL database is
minted with a bounded expiry (see `docs/STATE.md` section 5). That expiry instant
is recorded once, as a machine-read marker line in `docs/STATE.md` section 7:

    > **Hard deadline - rotate the database token before `<ISO-8601>`.**

Rotating the token therefore means editing that one line; this script deliberately
keeps no second copy of the date, so the record cannot drift away from the check.

Why this exists: the failure it guards against is **silent**. An expired token
fails every DB-backed route with no alert, while `/login` keeps answering `200`
to anyone without a session cookie (its `GET` returns before any database read) -
so the app looks partly alive and nothing announces the problem.

Design notes

* Fails if the marker is missing or unparseable. A guard that silently stops
  guarding is precisely the failure mode it is meant to prevent.
* The marker is anchored to the section 7 blockquote line. The same date is
  restated in prose elsewhere in the state file, and a loose search would happily
  match the first mention and ignore the authoritative one.
* Any *other* restatement of the deadline is parsed too and must agree. Those
  restatements are the realistic drift risk, so a disagreement fails the job
  rather than being quietly papered over by whichever came first.

Environment:
    STATE_FILE    path to the state file            (default: docs/STATE.md)
    WARN_DAYS     fail at this many days remaining  (default: 14)
    NOW_OVERRIDE  ISO-8601 "now", for testing       (default: real now)

WARN_DAYS is also a workflow_dispatch input, so the alarm path can be exercised
on the runner on demand (dispatch with e.g. 365) instead of being taken on trust.

Exit codes:
    0  more than WARN_DAYS remain
    1  within WARN_DAYS, or already expired
    2  the expiry could not be determined, or the records conflict
"""

from __future__ import annotations

import datetime as dt
import os
import re
import sys

# `or` rather than a get() default: an explicitly empty env var (which is what an
# unpopulated workflow-dispatch input can produce) must fall back to the default
# rather than raising - a false failure every day would train the reader to ignore
# this guard, which costs more than the guard is worth.
STATE_FILE = os.environ.get("STATE_FILE") or "docs/STATE.md"
WARN_DAYS_RAW = os.environ.get("WARN_DAYS") or "14"
NOW_OVERRIDE = os.environ.get("NOW_OVERRIDE") or ""

# Authoritative record: the section 7 blockquote deadline line.
ANCHORED = re.compile(
    r"^> .*Hard deadline.*rotate the database token before `([^`]+)`",
    re.MULTILINE,
)
# Any restatement of the deadline, which must agree with the record above.
RESTATED = re.compile(r"rotate the database token before `([^`]+)`")


def fail(message: str, code: int) -> int:
    print(f"::error::{message}")
    _write_summary("FAILED", message)
    return code


def _write_summary(status: str, message: str) -> None:
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    try:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(f"## Database token expiry guard: {status}\n\n{message}\n")
    except OSError:
        pass


def parse_instant(value: str) -> dt.datetime:
    """Parse an ISO-8601 instant, accepting a trailing Z (Python < 3.11 safe)."""
    parsed = dt.datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed


def main() -> int:
    try:
        warn_days = int(WARN_DAYS_RAW)
    except ValueError:
        return fail(f"WARN_DAYS={WARN_DAYS_RAW!r} is not an integer.", 2)

    try:
        with open(STATE_FILE, encoding="utf-8") as fh:
            state = fh.read()
    except OSError as exc:
        return fail(f"Could not read {STATE_FILE}: {exc}", 2)

    anchored = ANCHORED.search(state)
    if not anchored:
        return fail(
            f"No database-token deadline marker found in {STATE_FILE}. Expected a "
            "blockquote line in section 7 containing: "
            "rotate the database token before `<ISO-8601>`. If that line was reworded "
            "or removed, restore it - the expiry is otherwise unchecked, which is the "
            "situation this guard exists to prevent.",
            2,
        )

    raw = anchored.group(1)
    try:
        deadline = parse_instant(raw)
    except ValueError:
        return fail(
            f"Could not parse the recorded expiry {raw!r} in {STATE_FILE} as an "
            "ISO-8601 instant.",
            2,
        )

    # Every other restatement must agree with the authoritative record.
    conflicts = []
    for other in RESTATED.finditer(state):
        if other.group(1) == raw:
            continue
        try:
            if parse_instant(other.group(1)) != deadline:
                conflicts.append(other.group(1))
        except ValueError:
            conflicts.append(f"{other.group(1)!r} (unparseable)")
    if conflicts:
        return fail(
            f"Conflicting database-token expiry records in {STATE_FILE}: the section 7 "
            f"deadline says {raw!r} but other mentions say {', '.join(sorted(set(conflicts)))}. "
            "Reconcile them before trusting this check.",
            2,
        )

    try:
        now = parse_instant(NOW_OVERRIDE) if NOW_OVERRIDE else dt.datetime.now(dt.timezone.utc)
    except ValueError:
        return fail(f"NOW_OVERRIDE={NOW_OVERRIDE!r} is not a valid ISO-8601 instant.", 2)

    days = (deadline - now).total_seconds() / 86400
    detail = (
        f"recorded expiry {deadline.isoformat()}, {days:.1f} days remaining, "
        f"threshold {warn_days}d"
    )

    if days <= 0:
        return fail(
            f"EXPIRED: the production database token expired {abs(days):.1f} days ago "
            f"({deadline.isoformat()}). Production and Preview DB-backed routes are "
            "failing now, and /login still returns 200, so the breakage is partial and "
            f"unannounced. Rotate immediately - runbook in {STATE_FILE} section 5. "
            f"({detail})",
            1,
        )

    if days <= warn_days:
        return fail(
            f"EXPIRING IN {days:.1f} DAYS: the production database token expires "
            f"{deadline.isoformat()}. Rotate before then or Production and Preview "
            "DB-backed routes will fail with no alert. Runbook in "
            f"{STATE_FILE} section 5. ({detail})",
            1,
        )

    print(f"::notice::Database token expiry OK - {detail}")
    _write_summary(
        "OK",
        f"- Expires: `{deadline.isoformat()}`\n"
        f"- Remaining: {days:.1f} days\n"
        f"- Fails at: {warn_days} days or fewer\n",
    )
    print(f"OK: {detail}")
    print(f"Rotate before it drops to {warn_days} days or fewer.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
