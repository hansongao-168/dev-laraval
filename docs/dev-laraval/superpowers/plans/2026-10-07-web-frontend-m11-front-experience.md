# Web frontend M11: `@erp/front-experience`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Extract FrontPage block rendering into `@erp/front-experience` with a registry so storefront/home no longer owns mall block implementations.

**Architecture:** `docs/dev-laraval/architecture/web-frontend.md` M3 leftover; front-experience P5.

**Out of scope:** Studio, `@erp/front-schema`, miniapp/mobile custom adapters beyond consuming the shared package, new Mall blocks.

---

### Task 1: Package

- [x] `packages/front-experience`: types, `createBlockRegistry`, `PageRenderer`, default mall blocks.
- [x] Node tests for registry + unknown fallback.

### Task 2: Wire

- [x] `@erp/module-storefront` depends on package; delete local `page-renderer.tsx`.
- [x] `apps/web` FrontPage types from package.
- [x] ESLint boundaries allow `front-experience`.

### Task 3: Verify

- [x] Package tests + `lint:boundaries` + `check:clients`.
- [x] Architecture M11 marked done.
