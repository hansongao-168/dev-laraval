# Web frontend M14: three-end FrontPage consumption

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Mobile (Expo) and miniapp (Taro) fetch FrontPage documents via `@erp/front-experience` core and render `main` with platform block registries.

**Architecture:** front-experience P5 three-end registries; web already uses HTML `PageRenderer`.

**Out of scope:** Full mall UX polish, i18n packs for mobile/miniapp, Studio.

---

### Task 1: Core package

- [x] `fetchFrontPageDocument(http, slug, channel)` in `@erp/front-experience`.
- [x] Keep React `PageRenderer` on `@erp/front-experience/react`; core entry stays framework-free.

### Task 2: Apps

- [x] `apps/mobile` + `apps/miniapp`: front-page fetch, RN/Taro registries, home shows Document or fallback.
- [x] Depend on `@erp/front-experience`; miniapp drops `rootDir` so workspace `@erp/front-experience` `.ts` resolves under `tsc`.

### Task 3: Verify

- [x] Package/module/web/mobile/miniapp checks green; mark M14 done.
