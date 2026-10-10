# Web frontend M10: cmdk command palette

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** ⌘K / mobile sheet command palette in `@erp/ui/command`, fed by `useNav().flatten()`, routed by the web shell (no `next` inside `ui`).

**Architecture:** `docs/dev-laraval/architecture/web-frontend.md` §5 命令面板; M2 leftover.

**Out of scope:** `@erp/front-experience`, module entity-jump registry beyond an `extraItems` prop, i18n messages package.

---

### Task 1: `@erp/ui` command

- [x] Add `cmdk` to `@erp/ui`.
- [x] `navItemsToCommands` + `CommandPalette` (`dialog` | `sheet`).
- [x] Tests for command item mapping.

### Task 2: Web host

- [x] `CommandPaletteHost` uses `useNav`, `useDeviceClass`, `next/navigation`.
- [x] Mount from `AppProviders`. ⌘K / Ctrl+K and a visible trigger.
- [x] `@source` Tailwind so ui command classes are kept.

### Task 3: Verify

- [x] ui tests + `lint:boundaries` + web check.
- [ ] Browser: open palette, filter, navigate. (port 3100 occupied / browser MCP blocked)
- [x] Architecture M10 marked done.
