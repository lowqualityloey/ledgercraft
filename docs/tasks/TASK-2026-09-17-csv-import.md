# Task Record: Milestone 3 — Bank CSV Import (drafts + balanced post + dedup)

<a id="TASK-2026-09-17-csv-import"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-17-csv-import`
- **PromptKit Adaptation Profile**: `none` (legacy dated ID preserved)
- **Work Type**: `Code Work`
- **Planning Record Link**: `[PLAN-csv-import](../specs/2026-09-17-spec-csv-import.md#PLAN-csv-import)`
- **Planning Depth Reference**: `Full`
- **Assumption Record Links**: `[ASSUMPTION-csv-import-001, ASSUMPTION-csv-import-002](../specs/2026-09-17-spec-csv-import.md#PLAN-csv-import)` (both open, owner: user)
- **Specification**: `docs/specs/2026-09-17-spec-csv-import.md`
- **External Reference (Optional)**: `N/A`
- **Owner / Actor**: `user (solo maintainer)`
- **Execution Scope**: `Repository standalone (single Next.js app + local SQLite)`
- **Approval Boundary**: `Commits need explicit approval; no push without remote + approval; scope expansion needs Scope Change Record`
- **Created**: `2026-09-17 UTC`

> This Local Task Source is authoritative for Controlled Work. Planning/Assumption links are context only.

## 2. Objective and Boundaries

- **Objective**: Freelancer uploads a bank CSV, reviews drafts, posts selected rows as balanced journals (Cash 1000 leg + chosen offset); same file twice is rejected with zero new entries.
- **In Scope**:
  - `prisma/schema.prisma` — `ImportBatch` (+ `ImportStatus`)
  - `src/lib/csvImport.ts` — `parseCsv`, `fingerprint`, `buildDrafts`, `postDrafts` (hand-rolled parser, no new deps)
  - `src/actions/imports.ts` + `/imports` UI + home nav
  - Tests `src/lib/csvImport.test.ts` (≥12)
- **Explicit Non-Goals**:
  - Categorization rules/ML, bank API sync, FX conversion, PDF, CSV export, editing posted entries, per-batch cash-leg choice
- **Dependencies**: `None` (reuses M1 `postJournal` as-is)
- **Risk**: `Medium` - untrusted file input + money movement; mitigation: 1MB/500-row caps, row-numbered fail-closed parse, hash dedup, per-row idempotency, cents-only math
- **Verification Condition**: `bun test && bunx tsc --noEmit && bun run lint && bun run build` + dev smoke (upload → post → TB balanced → re-upload rejected)

## 3. Acceptance Criteria

- [ ] **AC-1**: Upload valid CSV yields correct drafts
  - **Result**: `Pending`
  - **Evidence**: `bun test (parse/draft cases)`
  - Gherkin: `Given a CSV with amount and debit/credit shapes, When uploaded, Then drafts show date, payee, signed cents; quoted commas parse.`
- [ ] **AC-2**: Bad rows fail closed with row numbers, nothing posts
  - **Result**: `Pending`
  - **Evidence**: `bun test (error cases)`
  - Gherkin: `Given a CSV with a bad amount on row 4, When uploaded, Then row-4 error, zero batches and zero entries created.`
- [ ] **AC-3**: Post selected creates balanced journals, skips unchecked
  - **Result**: `Pending`
  - **Evidence**: `bun test (post cases) + TB balanced`
  - Gherkin: `Given 3 drafts with 2 checked, When posted, Then 2 journals (Cash leg + offset), TB balanced, batch POSTED postedCount=2.`
- [ ] **AC-4**: Duplicate file and double-post are safe
  - **Result**: `Pending`
  - **Evidence**: `bun test (dedup cases)`
  - Gherkin: `Given an uploaded file, When uploaded again or posted twice, Then ConflictError / originals returned, entry count unchanged.`
- [ ] **AC-5**: UI + reports: /imports usable, TB/P&L correct
  - **Result**: `Pending`
  - **Evidence**: `bun run build + dev smoke`
  - Gherkin: `Given posted imports, When visiting /trial-balance, Then balanced with import totals; upload→post→re-upload-rejected works in browser with keyboard + ARIA.`

## 4. Execution Policy

- **Mode**: `Gated Mode`
- **TDD Enforcement Mode**: `disabled`
- **Batch Authorization**: `N/A`
- **Soft Checkpoint**: `Around 60 minutes`
- **Hard Checkpoint**: `At or before 90 minutes`
- **Event-Driven Checkpoints**: `Milestone, task switch, scope expansion, handoff, compaction, or context drift`
- **Stop Conditions**: `Missing approval/context, failed verification/CI/invariant, blocker, hard checkpoint, or developer stop`
- **Host Timer Capability**: `No mechanical enforcement; manual checkpoint discipline`

## 5. State and Active Ownership

- **Execution State**: `planned`
- **Mapped `pk:tasks` Status**: `To Do`
- **Active Task Pointer**: `None`
- **Start Time**: `N/A`
- **Current Actor**: `Assistant (planning)`
- **Next Action**: `Approve Task Record → commit planning docs → start M3.1 schema`

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
|---|---|---|---|---|---|
| `N/A` | `planned` | `2026-09-17 UTC` | `Assistant (pk:tasks)` | `Record created from PLAN-csv-import` | `docs/specs/2026-09-17-spec-csv-import.md` |

### Atomic Breakdown (1–4h each, dependency order)

- [ ] **M3.1: Schema (p0, area:data)** — `ImportBatch` migration + `prisma generate`; verify `bunx prisma validate && bunx tsc --noEmit`.
- [ ] **M3.2: Engine + unit tests (p0, area:backend)** — `src/lib/csvImport.ts` + `src/lib/csvImport.test.ts` (AC-1..AC-4, ≥12 tests); verify `bun test`.
- [ ] **M3.3: Actions + UI (p1, area:frontend)** — `src/actions/imports.ts` + `/imports` + nav; verify `bun run lint && bun run build`.
- [ ] **M3.4: Hardening + verify (p2)** — grep, full gate, dev smoke, manual acceptance; verify AC-5.

Invariants locked: INV-01 balanced fail-closed, INV-02 integer cents, INV-03 append-only, INV-04 local single-owner. Out of scope: rules/ML, bank APIs, FX, PDF, export, editing posts.

## 6. Evidence and Completion Gate

- **Changed Files**: `None yet (planning: docs/specs/2026-09-17-spec-csv-import.md + this record)`
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: `N/A - planned`
- **Behavior IDs [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence [Required when enabled]**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification [Required for Documentation, Configuration, or Research Work; Not applicable for Code Work]**: `N/A - Code Work`
- **CI Evidence**: `N/A`
- **Review Evidence**: `N/A`
- **Commit Evidence**: `N/A before commit`
- **Pull Request Evidence**: `N/A (no remote)`
- **Release Evidence**: `N/A`
- **Blocker and Resume Condition**: `None`

- **Completion State**: `planned`
- **Acceptance Results**: `AC-1..AC-5 pending`
- **Changed-File Summary**: `None yet`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `N/A - planned`
