# Web Frontend M4 — api-client CSRF / SSR cookie + Sanctum stateful

> **For agentic workers:** Use executing-plans. Tasks use checkbox syntax.

**Goal:** Make `@erp/api-client` inject CSRF and session cookies correctly from both the browser and Next SSR, and confirm Laravel Sanctum treats `apps/web` as a stateful frontend.

**Architecture:** Browser reads `document.cookie`; SSR forwards Next `cookies()` plus `Origin`/`Referer` so `EnsureFrontendRequestsAreStateful` (via `statefulApi()`) applies. Write requests send `X-XSRF-TOKEN`; 419 retries once. Laravel Set-Cookie is copied onto the Next cookie jar.

**Tech Stack:** Node tests (`--experimental-strip-types`), PHPUnit 12, Laravel Sanctum, Next.js `cookies()`.

**Out of scope:** M5 login UX / 401 redirect to `/login`; npm workspaces; Expo token mode.

## Tasks

- [x] `readCookieFromHeader` + Set-Cookie parse; Node tests
- [x] `createHttp`: `origin`, XSRF from SSR Cookie header, 419 retry outside `window`, `onSetCookie`
- [x] `apps/web` shared `ssr-http.ts`; fix API origin (no `/api/v1` double prefix)
- [x] `.env.example` + phpunit Sanctum/CORS domains; Feature test `GET /sanctum/csrf-cookie` with Origin
- [x] Mark architecture M4 done
