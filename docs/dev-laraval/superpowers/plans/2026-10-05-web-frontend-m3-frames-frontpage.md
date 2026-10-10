# Web Frontend M3 — Frames, NavRegistry, FrontPage home

**Goal:** Add L2 frames + `getFrame`, seed `@erp/config` routes with a NavRegistry provider, render `/` from FrontPage Document `main` slot (layout still owns chrome).

**Out of scope:** Full block registry / `@erp/front-experience`, cmdk, product `[id]`, npm workspaces.

## Tasks

- [x] `@erp/config`: `FRAME_IDS`, seeded `routes` (home/products/nav-demo/auth/me)
- [x] `@erp/ui`: List/Detail/Workspace/Empty frames + `getFrame`
- [x] `@erp/ui`: `NavRegistryProvider` / `useNav` / `resolveActiveNav`
- [x] L0 wrap `NavRegistryProvider` via `AppProviders`
- [x] Homepage: `GET /api/v1/front-pages/home` safe fetch; render `shell.slots.main` only; marketing fallback
- [x] Wrap products (`ListFrame`), `/me` (`DetailFrame`), `/nav-demo` (`EmptyFrame`)
- [x] Tests: config routes, nav-resolve, FRAME_IDS; ui chrome tests still run
- [x] `apps/web` lint / typecheck / build
