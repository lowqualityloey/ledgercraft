# Checkpoint Record 01: TASK-2026-09-17-csv-import

- **Task ID**: `TASK-2026-09-17-csv-import`
- **Specification**: `docs/specs/2026-09-17-spec-csv-import.md` (`PLAN-csv-import`, Full)
- **Execution State**: `completed` (all AC-1..AC-5 complete, user acceptance 2026-09-17)
- **Objective**: Bank CSV import — upload, draft review, post-selected balanced journals (Cash 1000 leg + chosen offset), sha256 dedup + per-row idempotency.
- **Completed**: PLAN-csv-import + Task Record (`bcf62fa`); M3.1 `ImportBatch` migration; M3.2 `csvImport.ts` + 14 tests (incl. empty debit/credit → 0 fix); M3.3 `/imports` UI + Actions (9/9 build); M3.4 grep + full gate; stale `:3000` replaced per approval, smoke 7/7.
- **Remaining**: None on this task. Manual acceptance done by user (real bank CSV → post → TB balances → re-upload rejected).
- **Changed files**: See Handoff Record §3. Branch `main` at `539de27` (plan `bcf62fa` + build `539de27`).
- **Decisions / invariants**: INV-01/02/03/04 hold; drafts unpersisted (deterministic rebuild); hand-rolled parser, no new deps; per-row keys `imp-{hash8}:{index}`; cash leg fixed 1000 (ASSUMPTION-csv-import-002 validated by acceptance).
- **Verification**: `bun test` 44 pass / 0 fail; `tsc --noEmit` green; `eslint` green; `bun run build` 9/9 routes; dev smoke 7/7 routes 200; invariant grep clean. CI: N/A (no pipeline).
- **Blockers**: None. **Scope changes**: None (PDF/auth/FX/Stripe stay in Later ledger).
- **Next action**: Define Milestone 4 scope (PDF receipts suggested) via `pk:plan`, or stop.
- **Policy**: Soft ~60min / hard ~90min checkpoints observed manually; host provides no mechanical timer (`POLICY_LIMITATION`).
