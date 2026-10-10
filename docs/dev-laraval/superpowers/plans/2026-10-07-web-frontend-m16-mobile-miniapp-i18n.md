# Web frontend M16: mobile / miniapp i18n packs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Wire `@erp/i18n` into `apps/mobile` and `apps/miniapp`; move user-facing CJK (and aligned home copy) into `messages/zh-CN.ts`.

**Architecture:** Completes M13 deferred three-end message packs; enforce with `erp/no-hardcoded-cjk`.

**Out of scope:** Locale switching UI, English catalogs, Playwright E2E.

---

### Task 1: Migrate

- [x] Depend on `@erp/i18n`; add `messages/zh-CN.ts` + `i18n.ts` in mobile and miniapp.
- [x] Home + block registries use `t()`.

### Task 2: Lint

- [x] Extend `erp/no-hardcoded-cjk` to `apps/mobile/src` + `apps/miniapp/src`.
- [x] Include those apps in `lint:boundaries` file set.

### Task 3: Verify

- [x] `npm run check:clients` green; mark M16 done.
