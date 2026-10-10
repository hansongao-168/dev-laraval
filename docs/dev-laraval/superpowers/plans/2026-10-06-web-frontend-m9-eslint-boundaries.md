# Web frontend M9: ESLint package boundaries

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Enforce architecture §1 dependency direction with ESLint so `apps` / `modules` / `packages` cannot import across forbidden layers.

**Architecture:** `docs/dev-laraval/architecture/web-frontend.md` §1 / §14 (ESLint 边界守卫).

**Out of scope:** cmdk, `@erp/front-experience`, page.tsx line-count rule, i18n lint.

---

### Task 1: `@erp/eslint-config`

- [x] Add `packages/eslint-config` with rule `erp/boundaries`.
- [x] Allowed: apps → modules + packages; modules → packages only (no `next`, no other modules); `ui`/`devices` → `config` (+ `ui` may use `api-client`); `api-client` → `config`; `config` is a leaf.
- [x] Node tests for happy/fail import cases.

### Task 2: Wire

- [x] Root `eslint.config.mjs` + `npm run lint:boundaries`.
- [x] Append `lint:boundaries` to `check:clients`.
- [x] Mark architecture M9 done.

### Task 3: Verify

- [x] `npm -w @erp/eslint-config test` and `npm run lint:boundaries` pass.
- [x] `npm run check:clients` still green.
