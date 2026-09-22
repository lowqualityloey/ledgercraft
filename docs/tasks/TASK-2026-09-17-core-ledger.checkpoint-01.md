# Checkpoint Record 01: TASK-2026-09-17-core-ledger

- **Task ID**: `TASK-2026-09-17-core-ledger`
- **Specification**: `docs/specs/2026-09-17-spec-core-ledger.md` (`PLAN-core-ledger`, Full)
- **Execution State**: `completed` (all AC-1..AC-6 complete, user acceptance 2026-09-17)
- **Objective**: Local double-entry core — seeded 5-class CoA, atomic balanced journal with cents-only math + reversals, Trial Balance + P&L.
- **Completed**: T1 scaffold, T2 migration + 15-account seed, T3 money/contracts + 10 tests, T4 engine + 17 tests, T5 actions + journal UI, T6 TB/P&L pages, T7 hardening + smoke.
- **Remaining**: None on this task. Manual browser acceptance done by user (expense + payment → TB balances).
- **Changed files**: See Handoff Record §3. Branch `main` at `6dc9529` (product `9a4f250` + docs `6dc9529`).
- **Decisions / invariants**: INV-01 balanced fail-closed, INV-02 integer cents, INV-03 append-only + reversals, INV-04 local single-owner; libSQL adapter (better-sqlite3 incompatible with Bun); idempotencyKey opaque (UUID) while account/entry ids stay cuid.
- **Verification**: `bun test` 17 pass / 0 fail; `bun run typecheck` green; `bun run lint` green; `bun run build` 8/8 routes; dev smoke 5/5 routes 200; seed idempotent; invariant grep clean. CI: N/A (no pipeline).
- **Blockers**: None. **Scope changes**: None (Later ledger untouched).
- **Next action**: Start next milestone via `pk:plan` when user defines Milestone 2 scope (or set up remote + `pk:pr` for review).
- **Policy**: Soft ~60min / hard ~90min checkpoints observed manually; host provides no mechanical timer (`POLICY_LIMITATION`).
