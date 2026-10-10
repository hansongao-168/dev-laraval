# Web frontend M12: thin page.tsx guards

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Enforce architecture L3 thin pages: `apps/web` `page.tsx` stay composers (≤15 lines; Document home may be ≤20).

**Architecture:** `docs/dev-laraval/architecture/web-frontend.md` §3 L3 + §14 first checklist item.

**Out of scope:** Moving Server Actions into modules; full i18n; single-line re-exports where SSR session is required.

---

### Task 1: Rule + thins

- [x] `erp/thin-page` ESLint rule (max 15; Document whitelist max 20).
- [x] Move nav-demo mapping into `@erp/module-storefront`.
- [x] Extract login page composer into `apps/web/src/lib/pages/`.

### Task 2: Wire + checklist

- [x] Root eslint enables rule on `apps/web/src/app/**/page.tsx`.
- [x] Strengthen `assert-site-zones` line checks.
- [x] Mark §14 items verified by zones/rule.

### Task 3: Verify

- [x] eslint-config tests + `lint:boundaries` + `check:clients`.
