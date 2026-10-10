# Web frontend M15: client test gate

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Run existing `node:test` suites for `packages/*` + `apps/web` inside `check:clients` / CI.

**Architecture:** `docs/dev-laraval/architecture/web-frontend.md` §10 — prefer current `node:test` + `.mjs` (no new Vitest/Playwright deps this milestone).

**Out of scope:** Playwright browser E2E, Vitest migration, mobile/miniapp test runners, Storybook.

---

### Task 1: Scripts

- [x] Root `test:packages` + `test:web`; append both to `check:clients`.

### Task 2: Smoke

- [x] `apps/web` smoke covering FrontPage helper / zone invariants as needed.

### Task 3: Verify

- [x] `npm run check:clients` green; mark M15 done in architecture.
