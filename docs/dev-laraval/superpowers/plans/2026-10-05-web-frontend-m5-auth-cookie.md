# Web Frontend M5 — Login → Sanctum Cookie → (account) SSR

**Goal:** Guest login/register persist Sanctum session cookies on Next, then `(account)` SSR reads `/api/v1/auth/me`.

**Out of scope:** M6 modules/auth extraction; token storage; cmdk.

## Tasks

- [x] Host `customer` guard + Sanctum `guard` list; AuthService uses `customer.auth.guard`
- [x] Allow base Customer model in `CustomerModels`
- [x] Feature test: csrf + login + `/auth/me` with Origin
- [x] `safeInternalPath`; login/register check `result.ok`; unwrap Resource `data`
- [x] Account layout gates guests; auth layout sends authed users to `/me`
- [x] Login form errors + Next 16 async `searchParams`
