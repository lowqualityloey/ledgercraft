# Project Architectural Profile (`PROMPTKIT.md`)

> **Instructions for AI**: Read this file during every session. Adhere strictly to the project domain boundaries, commands, documentation targets, and non-negotiable architectural rules defined below. Placeholders marked `[e.g. ...]` are **intake questions, not defaults**: when a value is unknown, report it to the user via the bounded intake (`protocols/discovery-intake.md`) instead of inventing a value.

## 0. PromptKit OS Profile
- **Profile**: balanced
- **Installed**: [YYYY-MM-DD]
- **Engine**: `.promptkit`
- **Description**:
  - `lite`: 6 utility workflows (route, debug, commit, checkpoint, sync, profile) <1,500 tok, 80% value — onboarding
  - `balanced`: the full 23-workflow set, Level 0-3 adaptive ceremony (default) — teams, production
  - `turbo`: experimental, Balanced + parallel subagent waves, up to ~2x measured token cost, still requires human L3 approval
- **Upgrade Path**: Run `.promptkit/init.sh --balanced` for full, `--lite` for minimal, `--turbo --experimental` for parallel waves — or switch in-session with `pk:profile`

profile: balanced

status-cards: on
> `status-cards: on` (default) emits the 3-line telemetry card on completion; `off` suppresses the decorative card only — `> [!IMPORTANT]` / `> [!WARNING]` halts still fire. A missing line means `on`.

size: medium
intake-status: complete
> `size:` and `intake-status:` are written by `pk:onboard` (greenfield Phase 0 interview, or a brownfield estimate marked `legacy-partial` when fields predate intake). `unanswered` or `partial` instructs `pk:plan` Step 0 to run the bounded intake in `protocols/discovery-intake.md` before proposing architecture. Never guess these values.

---

## 1. Project Overview & Domain
- **Project Name**: LedgerCraft
- **Domain / Purpose**: Rock-solid double-entry bookkeeping engine for freelancers and small businesses (double-entry CoA + journal + Trial Balance / P&L; durable on hosted libSQL, local dev and test isolated on the file database)
- **Primary Users**: Solo freelancer (Phase 0, single-owner, no auth)

---

## 2. Active Technology Stack
- **Language & Runtime**: TypeScript (Strict), Bun
- **Frontend Framework**: Next.js (App Router), React
- **Styling & Design System**: Tailwind CSS, dark/light, monospace tabular numbers
- **State & Data Fetching**: Server Actions + Prisma directly (no separate public API)
- **Backend & Database**: Hosted libSQL (Turso) through Prisma + `@prisma/adapter-libsql` + `@libsql/client`; Production and Preview hold `libsql://` `DATABASE_URL` + `DATABASE_AUTH_TOKEN`, while local dev and test run against `file:./ledger.db` (see M8, `docs/tasks/TASK-2026-09-18-hosted-libsql.md`)
- **Testing**: Bun test (Unit), `tsc --noEmit` (Typecheck)

---

## 3. Project Commands (Root / Global)
- **Install**: `bun install`
- **Dev Server**: `bun dev` (pinned to `file:./ledger.db` by `.env.development.local`; production runs hosted libSQL)
- **Unit Tests**: `bun test`
- **E2E Tests**: `bun test:e2e` (deferred — no harness yet)
- **Typecheck**: `bunx tsc --noEmit`
- **Lint & Format**: `bun run lint` (script present: eslint + `eslint-config-next`)

---

## 4. Monorepo & Workspace Topology (If Applicable)
N/A (Standalone Repository — single Next.js app; hosted libSQL in production, file database for dev/test)

---

## 5. Active MCP Capabilities (Optional)
> Record detected or configured Model Context Protocol (MCP) servers (via Docker Desktop MCP, stdio `npx`, or native client configs). PromptKit OS follows a **Progressive Enhancement** model: MCP tools serve as optional accelerators. When available, assistants prioritize native MCP tool calls; when unavailable, assistants seamlessly fall back to structured Markdown and terminal CLI commands with zero errors.

- **Reasoning / Scratchpad MCP**: [e.g. `sequential-thinking` (`@modelcontextprotocol/server-sequential-thinking`) for `pk:debug` hypothesis branching & `pk:plan` tradeoffs | N/A]
- **Documentation / Web Reader MCP**: [e.g. `fetch` (`@modelcontextprotocol/server-fetch`) or Jina reader for clean primary doc lookups | N/A]
- **Task Tracking System**: [Local Markdown (docs/tasks/ + docs/STATE.md) | GitHub Issues | Jira (manual import, no auto-push) | Linear (manual import, no auto-push)]
- **Task Tracking Selector (machine-readable)**: `tracking: local` + `projection: github` (options: `local|github|jira|linear`; Jira/Linear = manual import, board is projection only, Local Task Record authoritative). `projection: github` mirrors local task records to GitHub Issues via `gh`; the local Task Record stays authoritative and no milestone may depend on the issue board existing.
- **GitHub MCP**: [e.g. `github-mcp-server` for PR creation, issue reading, commit search | N/A]
- **Database MCP**: [e.g. `postgres-mcp` or `sqlite-mcp` for read-only schema discovery & `pk:data` checks | N/A]
- **Browser / UI MCP**: [e.g. `playwright` for `pk:design` visual and E2E verification | N/A]
- **Execution Precedence**: Native MCP Tools $\rightarrow$ Native IDE Search/Edit Tools $\rightarrow$ Terminal CLI Commands $\rightarrow$ Structured Markdown Fallback

### 5a. LSP Capabilities (Optional)
> Record detected language-server capabilities for range-accurate diagnostics (`file:line:col`) consumed by `pk:review`. Progressive Enhancement applies: LSP is an optional accelerator, disabled by default, with zero token overhead for Lite-profile users. When unavailable, assistants fall back to the Section 3 typecheck/lint commands with zero errors. The assistant never starts or enables a language server; humans configure in-host.

- **LSP Enabled**: [false (default) | true | not measured]
- **LSP Servers**: [e.g. `tsserver`, `pyright`, `rust-analyzer` | none]
- **Evidence Source**: [lsp-mcp | tsc-cli | not measured]

---

## 6. Documentation & Artifact Storage Paths
All artifacts generated by PromptKit workflows must be saved to these host project paths:
- **Architectural Decision Records (ADRs)**: `docs/adrs/`
- **Technical RFC Specs**: `docs/specs/`
- **Incident Post-Mortems (RCAs)**: `docs/rca/`
- **Technical Spikes & Benchmarks**: `docs/spikes/`
- **Design Tokens & UI Specs**: `docs/design/`
- **Data Models & Schemas**: `docs/data/`
- **Authentication & RBAC Matrices**: `docs/auth/`
- **API Contracts & Envelopes**: `docs/api/`
- **Test Strategy & Plans**: `docs/tests/`
- **Release Checklists & Reports**: `docs/releases/`
- **Session Continuity Logs**: `docs/session-log/`

### Standard Root Documentation (Optional / Detected)
- **Architecture Blueprint**: N/A
- **Strategic Roadmap**: N/A
- **Operations Runbook**: N/A
- **Code Style Guide**: N/A
- **Intake Record**: `docs/specs/2026-09-17-intake-ledgercraft.md` (`close_reason: human_stopped`)

---

## 7. Non-Negotiable Architecture Rules & Guardrails
- [ ] **LedgerCraft Double-Entry Balance**: Every transaction must satisfy Sum(Debits)==Sum(Credits) in integer minor units; unbalanced input throws hard validation error and fails to persist.
- [ ] **LedgerCraft Monetary Precision**: All money as integer minor units (cents, $10.00=1000); never float for currency math/display.
- [ ] **LedgerCraft Append-Only Journal**: Posted journal entries immutable — no update/delete; corrections via reversing entries only.
- [ ] **Zero `any` / Loose Casting**: Strict TypeScript at all times. Use Zod/Valibot schemas for boundary parsing.
- [ ] **No Business Logic in UI**: Presentation components only render props and dispatch intents; business logic lives in domain hooks or service layers.
- [ ] **Database Invariants First**: Foreign keys, unique constraints, and check constraints live in the database schema, not just application code.
- [ ] **WCAG 2.2 AA Compliance**: All interactive elements must support keyboard navigation, visible focus rings, and proper ARIA labels.
- [ ] **Deterministic Error Handling**: No silent `catch {}` blocks. Use typed `Result<T, E>` or centralized error boundaries.
- [ ] **Anti-Slop & Structured Scannable Output**: Output all status updates, plans, and diffs in structured scannable markdown (tables, checklists, short bullets). Prohibit long narrative conversational essays.
- [ ] **Absolute Secret Hygiene & `.env.example`**: Never paste, expose, or request secrets, API keys, or credentials in chat. Maintain `.env.example` with placeholder keys and instruct developers to manage `.env` locally.
- [ ] **Context Window Reset Threshold (~30 Turns)**: When conversation approaches ~30 turns or high token saturation, run `pk:checkpoint` to synchronize `docs/STATE.md` and recommend continuing in a fresh session via `pk:route`.
- [ ] **Standardized Human Action Callouts**: When terminating a turn that requires user decision, approval, or local action (e.g. merging PR, editing `.env`), terminate with a high-contrast `> [!IMPORTANT]` block titled `### 🛑 Action Required From You:`. If blocked, terminate with `> [!WARNING]` titled `### ⚠️ Blocked: Waiting on Human Input`.
- [ ] **Strict Milestone Git Boundaries**: Never start a new milestone or major task phase carrying this task's own uncommitted changes (pre-existing dirt — including fresh `init.sh` scaffold output — is surfaced and recommended for commit, never a stall reason). working tree. Upon completing a milestone, run test verification, prompt for or execute atomic staging (`pk:commit`), update `docs/STATE.md`, and obtain human confirmation with `> [!IMPORTANT]` before proceeding.
<!-- Optional: Uncomment if using GitHub Issues or external issue tracker -->
<!-- - [ ] **Issue Tracker Synchronization**: Decompose all feature milestones and bugs into atomic issues with Gherkin AC via `pk:tasks` before active coding. Commits must reference issue IDs (`Closes #N`). -->

tracking: local
projection: github
