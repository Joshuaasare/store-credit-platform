# Agent Orchestration

## Agent Registry

### `feature-developer`

**Purpose:** End-to-end feature implementation (backend + frontend)
**Model:** sonnet
**Memory:** project
**Tools:** All tools (Read, Edit, Write, Bash, Agent, etc.)

**Responsibilities:**

- Implement features following the type-first workflow.
- Generate backend types, services, routes, and frontend pages.
- Always check `.claude/plans/` for an existing plan before starting.
- After implementation, run `/test-affected` and `/browser-check` before declaring success.

**Guard Clauses:**

- Never edit `apps/storecredit-api/src/app/schemas/*.schema.ts` directly.
- After editing `.types.ts` files, run `yarn generate:types`.
- Never commit directly to `main` or `develop`.
- Always create draft PRs.
- Never run destructive Bash commands without confirmation.

---

### `test-runner`

**Purpose:** Run tests on affected code and report failures concisely
**Model:** sonnet
**Memory:** none (stateless)
**Tools:** Bash, Read

**Responsibilities:**

- Run `nx affected --target=test --base=develop`.
- Parse stdout/stderr and report ONLY failed test names + error snippets.
- Do not dump full logs unless explicitly requested.

**Guard Clauses:**

- Never run tests on `main` or `develop` directly (always use affected or specific project).
- If tests fail, stop and report; do not auto-fix unless instructed.

---

### `browser-check`

**Purpose:** Automated visual testing via dev-server health checks
**Model:** sonnet
**Memory:** none (stateless)
**Tools:** Bash, Read

**Responsibilities:**

- Start the dev server in background (`nx serve [app]` or `nx start [rn-app]`).
- For web apps: poll `localhost:PORT` until 200, capture console errors.
- For React Native: report Metro status and bundler health.
- Clean up: stop the dev server after check.

**Guard Clauses:**

- Always clean up background processes.
- Never leave dev servers running indefinitely.
- Do not open actual browser windows; use curl/headless checks.

---

### `code-reviewer`

**Purpose:** Independent adversarial review of code changes
**Model:** sonnet
**Memory:** none (stateless)
**Tools:** Read, Bash (git diff)

**Responsibilities:**

- Review git diffs or specific files for correctness, security, and style.
- Challenge assumptions and verify edge cases.
- Report findings in a concise bulleted format.

**Guard Clauses:**

- Do not auto-apply fixes; only report.
- If unsure about a finding, flag it as uncertain.
- Never approve code without genuine review.

---

### `explore`

**Purpose:** Fast read-only codebase search
**Model:** sonnet
**Memory:** none (stateless)
**Tools:** Read, Bash (find, grep)

**Responsibilities:**

- Locate files by pattern, grep for symbols, or answer "where is X defined."
- Return file paths and relevant snippets only.
- Do NOT perform code review or design analysis.

**Guard Clauses:**

- Read-only only; never write or edit.
- Do not summarize code behavior; just locate it.

---

## Universal Guard Clauses (Apply to ALL Agents)

1. **Type-First Workflow:** Backend types live in `apps/storecredit-api/src/app/types/*.types.ts`. After editing types, run `yarn generate:types`. Schema files are auto-generated.
2. **Git Safety:** No direct commits to `main` or `develop`. All work on feature branches. PRs must be drafts.
3. **Destructive Operations:** Before `rm -rf`, `git reset --hard`, `nx migrate`, database drops, or package removals, use `AskUserQuestion` for explicit confirmation.
4. **Dependency Rules:** Shared packages → root `package.json`. App-specific → app-level. See `.github/instructions/dependencies.md`.
5. **Agent Output Rule:** When running `/agents`, always print the output or content of the agent action in the terminal.
