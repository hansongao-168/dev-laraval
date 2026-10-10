# Web Frontend M2 — DeviceShell + `@erp/ui` + FrontNav chrome

> **For agentic workers:** Implement task-by-task. Spec: `docs/dev-laraval/architecture/web-frontend.md` §15 M2.

**Goal:** Minimal DeviceShells in `@erp/ui`, zone layouts switch chrome by `deviceClass`, storefront header/footer (and account sidebar/mobile) from FrontNav.

**Out of scope:** cmdk, L2 Frames, FrontPage Document, npm workspaces, B/C IA.

## Global Constraints

- `@erp/ui` must not depend on `apps/*`, `next`, or `@erp/devices` (pass `deviceClass` in).
- `@erp/ui` may depend on `@erp/config` only (plus React peer).
- Keep `(storefront)/(account)/(auth)`; no device route groups.
- FrontNav fetch failures must not crash layouts (empty nav).

---

### Task 1: `@erp/ui` shells

- Create `packages/ui` with `StorefrontChrome`, `AccountChrome`, `AuthFrame`.
- `splitChromeLinks(items, limit)` for mobile 4+more.
- Unit test split helper.

### Task 2: Wire zone layouts

- Map FrontNav → chrome links in `apps/web`.
- Client zone wrappers use `useDeviceClass()`.
- Storefront: header + footer; Account: sidebar + mobile; Auth: AuthFrame.

### Task 3: Verify + docs

- `check:zones`, lint, typecheck, build, package tests.
- Mark M2 done in architecture doc.
