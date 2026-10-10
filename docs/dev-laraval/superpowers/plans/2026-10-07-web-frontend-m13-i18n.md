# Web frontend M13: `@erp/i18n` + no hardcoded CJK

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add `@erp/i18n`, move user-facing Chinese out of views into `messages/`, enforce with `erp/no-hardcoded-cjk`.

**Architecture:** `docs/dev-laraval/architecture/web-frontend.md` §13 risk 6.

**Out of scope:** Full locale switching UI, miniapp/mobile message packs, English catalog completeness.

---

### Task 1: Package + migrate

- [x] `packages/i18n` with `createTranslator`.
- [x] Module / front-experience / web `messages/zh-CN.ts` + `t()`.
- [x] Views and thin shell chrome use `t()`.

### Task 2: Lint

- [x] `erp/no-hardcoded-cjk` on modules + front-experience + ui + apps/web src (allow `**/messages/**`).
- [x] ESLint boundaries allow `i18n`.

### Task 3: Verify

- [x] Tests + `lint:boundaries` + `check:clients`; mark M13 done.
