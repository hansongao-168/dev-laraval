# @erp/front-nav

Front-end SDK for the `gz168/front-nav` Laravel module.

This package is **read-only**: it knows nothing about the database, the
registry, or the server-side `NavItem` class. It consumes the JSON
payload produced by `GET /api/v1/front-nav` and gives front-end apps a
small, framework-friendly surface to:

- **Fetch** the nav tree for one or more `location`s.
- **Cache** the response with a TTL (process-local, swappable).
- **Resolve** translations through whatever i18n library the host uses,
  falling back to the backend-provided `label` when no key matches.
- **React 19** hook with the same semantics + a `refresh()` for cache
  invalidation after a `NavStructureChanged` event.

## Install

This package is consumed by `apps/web`, `apps/mobile`, and any other
front-end that talks to the Laravel API:

```json
{
  "dependencies": {
    "@erp/front-nav": "file:../../packages/front-nav"
  }
}
```

## Core usage (framework-agnostic)

```ts
import { createHttp } from '@erp/api-client/core'
import {
  fetchNav,
  resolveLabels,
  createNavCache,
} from '@erp/front-nav'

const http = createHttp({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL! })
const cache = createNavCache({ ttlMs: 5 * 60_000 })

export async function getSidebar(locale: string) {
  const cached = cache.get('sidebar', locale)
  const payload = cached ?? (await fetchNav(http, { location: 'sidebar', locale }))
  if (!cached) cache.set('sidebar', locale, payload)
  return resolveLabels(payload.data, (k) => i18n.t(k))
}
```

## React 19 hook

```tsx
'use client'
import { useFrontNav } from '@erp/front-nav/react'
import { useTranslation } from 'react-i18next'

export function Sidebar() {
  const { t } = useTranslation()
  const { items, loading, error, refresh } = useFrontNav({
    http,
    locations: ['sidebar'],
    locale: i18n.language,
    translate: t,
  })

  if (loading) return null
  if (error) return <p>nav error</p>
  return (
    <nav>
      {items.sidebar.map((item) => (
        <a key={item.key} href={item.url}>{item.label}</a>
      ))}
      <button onClick={refresh}>refresh</button>
    </nav>
  )
}
```

## Server-side usage (Next.js / SSR)

```ts
// apps/web/src/lib/front-nav.ts
import { cookies } from 'next/headers'
import { createHttp } from '@erp/api-client/core'
import { fetchNav, resolveLabels } from '@erp/front-nav/core'

export async function getFrontNav(location: string, locale?: string) {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')

  const http = createHttp({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL!,
    cookies: () => cookieHeader,        // forward visitor session
  })

  const { data } = await fetchNav(http, { location, locale })
  return resolveLabels(data, (key) => key) // server-side: pass-through
}
```

A working example lives at `apps/web/src/app/(desktop)/nav-demo/page.tsx`.

## Wire shape

Mirrors `Gz168\FrontNav\Contracts\NavItem`. Each tree row carries its
`children` already resolved (max 2 levels deep — the server collapses
deeper nesting into top-level rows with `parent` pointers). When the
host passes a `Translator`, the SDK uses the translator to override
each item's `label` with the value of its `labelKey`. Missing keys
fall back to the server-side `label`.

## Tests

```
npm test                # core + e2e + react (20 tests)
npm run test:core       # core only (9 tests)
npm run test:e2e        # e2e only (5 tests, spins up a fake Laravel-shaped server)
npm run test:react      # React hook tests (6 tests, jsdom + @testing-library/react)
npm run typecheck       # tsc --noEmit
```

React hook tests live in `tests/react.test.mjs` (uses React's `act`
helper from `react-dom/test-utils`).

## CI

`.github/workflows/front-nav.yml` runs the full test surface (module
PHPUnit + host feature PHPUnit + SDK node:test + pint) on every push
and PR that touches `gz168/FrontNav/**`, `packages/front-nav/**`, or
`tests/Feature/FrontNav/**`.
