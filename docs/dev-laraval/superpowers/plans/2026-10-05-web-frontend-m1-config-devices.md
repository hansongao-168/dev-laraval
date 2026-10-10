# Web Frontend M1 — `@erp/config` + `@erp/devices` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract leaf `@erp/config` and `@erp/devices` packages, wire `DeviceProvider` into L0, keep site zones unchanged.

**Architecture:** `config` is a zero-dependency leaf (types, breakpoints, `aggregateNav`, empty `routes`). `devices` depends only on `config` + React peers. `apps/web` consumes both via `file:` (same as `@erp/api-client`). Do **not** enable npm workspaces (M0 leftover / M8). Do **not** add DeviceShell / `@erp/ui` (M2).

**Tech Stack:** TypeScript, React 19, Next.js 16 `transpilePackages`, Node `node:test` with `--experimental-strip-types`.

## Global Constraints

- Next 16 / React 19 / Tailwind 4; no new UI libraries.
- `@erp/config` has zero runtime dependencies.
- `@erp/devices` may depend on `@erp/config` only (plus React peer).
- Site IA A: keep `(storefront)/(account)/(auth)`; no device route groups.
- Do not implement B/C, FrontPage Document, cmdk, or module extraction.
- Do not expose `.env` secrets.

---

### Task 1: `@erp/config` leaf package

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig.json`
- Create: `packages/config/src/types.ts`
- Create: `packages/config/src/breakpoints.ts`
- Create: `packages/config/src/routes.ts`
- Create: `packages/config/src/index.ts`
- Create: `packages/config/tests/config.test.mjs`

- [x] Types `DeviceClass`, `FrameId`, `NavItem` as in `web-frontend.md` §5
- [x] `BREAKPOINTS` + `classifyViewportWidth(width)`
- [x] `aggregateNav(groups: NavItem[][]): NavItem[]` flatten + sort by `priority` desc (default 100)
- [x] `routes: NavItem[] = []` placeholder
- [x] Tests for classify + aggregateNav; `node --test packages/config/tests/config.test.mjs`

### Task 2: `@erp/devices` + L0 wire-up

**Files:**
- Create: `packages/devices/package.json` (`file:../config`, peer `react`)
- Create: `packages/devices/tsconfig.json`
- Create: `packages/devices/src/infer.ts`
- Create: `packages/devices/src/react.tsx` (`'use client'`)
- Create: `packages/devices/src/index.ts`
- Modify: `apps/web/package.json` — add `file:` deps
- Modify: `apps/web/next.config.ts` — `transpilePackages: ['@erp/config', '@erp/devices']`
- Modify: `apps/web/src/app/layout.tsx` — wrap with `DeviceProvider`

- [x] `inferInitialDeviceClass({ viewportWidthHeader, userAgent })`: CH width → classify; else UA mobile/tablet heuristic; else `desktop`
- [x] `DeviceProvider` + `useDeviceClass` / `useBreakpoint` / `useIsTouch` / `useOrientation` / `DeviceGate`
- [x] L0 reads `headers()` (`sec-ch-viewport-width`, `user-agent`) and passes `initialDeviceClass`
- [x] Zone layouts **do not** switch Shell yet (M2)

### Task 3: Verify + docs

- [x] `npm --prefix apps/web install`
- [x] `npm --prefix apps/web run check:zones` / `lint` / `typecheck` / `build`
- [x] Mark M1 **done** in `docs/dev-laraval/architecture/web-frontend.md` §15
