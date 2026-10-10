# Web Frontend M6 — modules/auth + modules/users

**Goal:** First vertical slices: auth and users views + `nav.ts`; `apps/web` pages compose session/actions and re-export views. Layouts stay in the shell.

**Out of scope:** npm workspaces; moving `ssr-http` / Server Actions into modules (they need Next); M7 emptying remaining storefront pages.

## Tasks

- [x] `@erp/module-auth`: Login/Register/Forgot views, nav, no `next` import
- [x] `@erp/module-users`: Profile/Settings/Security views, nav
- [x] `apps/web` pages become thin composers; NavRegistry aggregates module nav + storefront routes
- [x] `file:` deps + transpilePackages; module nav tests; lint/typecheck/build
