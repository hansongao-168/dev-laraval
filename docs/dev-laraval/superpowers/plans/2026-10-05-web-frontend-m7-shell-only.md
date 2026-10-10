# Web Frontend M7 — Shell-only apps/web

**Goal:** Move remaining storefront business views out of `apps/web`; pages stay thin composers; layouts / SSR helpers stay in the shell.

**Out of scope:** npm workspaces (M8); moving Server Actions / `ssr-http` into modules; full Mall catalog.

## Tasks

- [x] `@erp/module-storefront`: Home / Products / NavDemo views + PageRenderer + nav
- [x] Empty `@erp/config` seeded storefront routes (module owns them)
- [x] Thin `(storefront)` pages; delete `customer.ts` + shell `page-renderer`
- [x] Wire `file:` dep, transpilePackages, zone assert, tests/build
