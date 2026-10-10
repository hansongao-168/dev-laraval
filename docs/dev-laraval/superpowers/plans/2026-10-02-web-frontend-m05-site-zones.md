# Web Frontend M0.5 — Site Zones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove parallel `(desktop)/(tablet)/(mobile)` routes that break `next build`, and land the site IA dual-tree skeleton `(storefront)` + `(account)` + `(auth)` so each public URL has exactly one `page.tsx`.

**Architecture:** Keep L0 `app/layout.tsx`. Move `/me/*` into `(account)/` with one account chrome layout (adapted from current desktop sidebar). Move `/` and stubs into `(storefront)/` with a minimal header/footer chrome. Leave `(auth)/` as-is. Do **not** implement DeviceShell packages, FrontPage Document wiring, or B/C alternatives in this milestone.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `@erp/api-client`, `@erp/front-nav` (file: dependency), Tailwind CSS 4.

**Specs:**
- `docs/dev-laraval/superpowers/specs/2026-10-02-web-frontend-shell-routing-design.md`
- `docs/dev-laraval/superpowers/specs/2026-10-02-web-frontend-site-ia-design.md`
- `docs/dev-laraval/architecture/web-frontend.md` §15 M0.5

## Global Constraints

- PHP / Laravel versions unchanged this milestone; frontend only under `apps/web` (+ optional tiny guard script).
- Next.js 16 / React 19 / Tailwind 4 — match `apps/web/package.json`.
- **Never** create `(desktop)`, `(tablet)`, or `(mobile)` route groups for business pages.
- **Never** put two `page.tsx` files that resolve to the same URL (including `app/page.tsx` vs `(storefront)/page.tsx` both owning `/`).
- Current implementation path is site IA **A** only; do not implement B or C.
- Do not introduce Redux/Zustand, MUI/Antd, or new npm deps beyond reinstalling existing `file:` packages.
- Do not expose `.env` secrets.
- Prefer `git mv` / explicit deletes; keep `(auth)/` behavior unchanged.
- After PHP-less JS edits, still run `apps/web` lint + typecheck + build as verification.
- Commits: conventional, focused; only when the human asks to commit **or** when executing this plan’s commit steps as the implementer.

## File map (target)

| Path | Role |
|---|---|
| `apps/web/scripts/assert-site-zones.mjs` | Guard: no device route groups; required zone dirs exist |
| `apps/web/src/app/(account)/layout.tsx` | Account chrome (sidebar + top bar) |
| `apps/web/src/app/(account)/me/page.tsx` | Profile (from desktop) |
| `apps/web/src/app/(account)/me/settings/page.tsx` | Settings |
| `apps/web/src/app/(account)/me/security/page.tsx` | Security |
| `apps/web/src/app/(storefront)/layout.tsx` | Storefront chrome (header + footer) |
| `apps/web/src/app/(storefront)/page.tsx` | Home `/` (moved from `app/page.tsx`) |
| `apps/web/src/app/(storefront)/products/page.tsx` | Products list stub |
| `apps/web/src/app/(storefront)/nav-demo/page.tsx` | FrontNav demo (from desktop) |
| `apps/web/src/app/(auth)/**` | Unchanged |
| `apps/web/src/app/layout.tsx` | L0 unchanged (aside comments if needed) |
| Delete | `apps/web/src/app/(desktop)/**`, `(tablet)/**`, `(mobile)/**`, `apps/web/src/app/page.tsx` |

---

### Task 1: Zone guard script (failing until tree is fixed)

**Files:**
- Create: `apps/web/scripts/assert-site-zones.mjs`
- Modify: `apps/web/package.json` (add script `check:zones`)

**Interfaces:**
- Consumes: filesystem under `apps/web/src/app`
- Produces: exit code `0` only when device groups are gone and `(storefront)`, `(account)`, `(auth)` exist

- [ ] **Step 1: Write the guard script**

```js
// apps/web/scripts/assert-site-zones.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(__dirname, '../src/app')

const forbidden = ['(desktop)', '(tablet)', '(mobile)']
const required = ['(storefront)', '(account)', '(auth)']

const errors = []

for (const name of forbidden) {
  if (fs.existsSync(path.join(appDir, name))) {
    errors.push(`Forbidden route group still present: ${name}`)
  }
}

for (const name of required) {
  if (!fs.existsSync(path.join(appDir, name))) {
    errors.push(`Required route group missing: ${name}`)
  }
}

// Root app/page.tsx would conflict with (storefront)/page.tsx on URL `/`
if (fs.existsSync(path.join(appDir, 'page.tsx'))) {
  errors.push('Remove apps/web/src/app/page.tsx — `/` must live under (storefront)/page.tsx only')
}

if (errors.length > 0) {
  console.error('assert-site-zones failed:\n' + errors.map((e) => ` - ${e}`).join('\n'))
  process.exit(1)
}

console.log('assert-site-zones: OK')
```

- [ ] **Step 2: Register npm script**

In `apps/web/package.json` `scripts`, add:

```json
"check:zones": "node ./scripts/assert-site-zones.mjs"
```

- [ ] **Step 3: Run guard — expect FAIL (tree not migrated yet)**

Run: `npm --prefix apps/web run check:zones`

Expected: exit `1`, messages about forbidden `(desktop)` etc. and/or missing `(storefront)` / `(account)`, and root `page.tsx`.

- [ ] **Step 4: Commit** (when executing)

```bash
git add apps/web/scripts/assert-site-zones.mjs apps/web/package.json
git commit -m "$(cat <<'EOF'
test(web): add assert-site-zones guard for M0.5 route groups

EOF
)"
```

---

### Task 2: Relink `@erp/front-nav` so `/nav-demo` can build

**Files:**
- Modify: `apps/web/node_modules/@erp/front-nav` (via install; not hand-edited)
- Verify: `apps/web/package.json` already has `"@erp/front-nav": "file:../../packages/front-nav"`

**Interfaces:**
- Consumes: `packages/front-nav` exports `./core`
- Produces: resolvable `import '@erp/front-nav/core'` from `apps/web/src/lib/front-nav.ts`

- [ ] **Step 1: Confirm the package is missing from node_modules**

Run: `ls -la apps/web/node_modules/@erp`

Expected today: only `api-client` symlink (no `front-nav`).

- [ ] **Step 2: Reinstall web deps**

Run: `npm --prefix apps/web install`

Expected: `apps/web/node_modules/@erp/front-nav` → `../../../../packages/front-nav` (or equivalent file link).

- [ ] **Step 3: Smoke-resolve the export**

Run:

```bash
node -e "import('@erp/front-nav/core').then(m => console.log(Object.keys(m).sort().join(','))).catch(e => { console.error(e); process.exit(1) })"
```

Working directory: `apps/web`

Expected: prints keys including at least `fetchNav` (and related exports). No `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 4: Commit** only if lockfile / package-lock changed

```bash
git add apps/web/package-lock.json 2>/dev/null || true
# If no lockfile in repo, skip. Do not commit node_modules.
```

---

### Task 3: Create `(account)` and move `/me/*`

**Files:**
- Create: `apps/web/src/app/(account)/layout.tsx`
- Create: `apps/web/src/app/(account)/me/page.tsx` (copy from desktop; then delete old)
- Create: `apps/web/src/app/(account)/me/settings/page.tsx`
- Create: `apps/web/src/app/(account)/me/security/page.tsx`
- Delete after move: `apps/web/src/app/(desktop)/me/**`, `(mobile)/me/**`, `(tablet)/me/**`

**Interfaces:**
- Consumes: `getCurrentSession`, `logoutAction` from `@/lib/server-customer`
- Produces: unique routes `/me`, `/me/settings`, `/me/security`

- [ ] **Step 1: Add account layout**

Create `apps/web/src/app/(account)/layout.tsx`:

```tsx
import type { ReactNode } from 'react'
import Link from 'next/link'
import { getCurrentSession, logoutAction } from '@/lib/server-customer'

/**
 * (account) zone layout — Account chrome skeleton (site IA A).
 * DeviceShell extraction is M1/M2; this is a single layout for all viewports.
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              E
            </span>
            <span className="font-semibold tracking-tight text-slate-900">ERP Global</span>
          </Link>
          <div className="flex items-center gap-3">
            {session.user ? (
              <>
                <span className="text-sm text-slate-600">{session.user.email}</span>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    退出
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login?next=/me"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        <aside className="w-56 shrink-0">
          <nav className="flex flex-col gap-1">
            <Link href="/me" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
              我的
            </Link>
            <Link href="/me/settings" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
              设置
            </Link>
            <Link href="/me/security" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
              安全
            </Link>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Move me pages with git mv (prefer) or copy+delete**

```bash
mkdir -p apps/web/src/app/\(account\)/me/settings apps/web/src/app/\(account\)/me/security
git mv apps/web/src/app/\(desktop\)/me/page.tsx apps/web/src/app/\(account\)/me/page.tsx
git mv apps/web/src/app/\(desktop\)/me/settings/page.tsx apps/web/src/app/\(account\)/me/settings/page.tsx
git mv apps/web/src/app/\(desktop\)/me/security/page.tsx apps/web/src/app/\(account\)/me/security/page.tsx
```

If `git mv` fails because paths are awkward, `cp` then `git add` new + `git rm` old.

- [ ] **Step 3: Delete mobile/tablet me re-exports and empty dirs**

```bash
rm -rf apps/web/src/app/\(mobile\)/me apps/web/src/app/\(tablet\)/me
```

Update file headers in moved pages: change comments that say `(desktop)` to `(account)`.

- [ ] **Step 4: Sanity — only one `/me` page file**

Run: `find apps/web/src/app -path '*/me/page.tsx' | sort`

Expected: exactly one line — `apps/web/src/app/(account)/me/page.tsx`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(account\)
git add -u apps/web/src/app/\(desktop\) apps/web/src/app/\(mobile\) apps/web/src/app/\(tablet\)
git commit -m "$(cat <<'EOF'
refactor(web): move /me routes into (account) zone

EOF
)"
```

---

### Task 4: Create `(storefront)`, own `/`, add products stub + nav-demo

**Files:**
- Create: `apps/web/src/app/(storefront)/layout.tsx`
- Create: `apps/web/src/app/(storefront)/page.tsx` (from root `app/page.tsx`, trim duplicate chrome)
- Create: `apps/web/src/app/(storefront)/products/page.tsx`
- Create: `apps/web/src/app/(storefront)/nav-demo/page.tsx` (from desktop)
- Delete: `apps/web/src/app/page.tsx`
- Delete: `apps/web/src/app/(desktop)/nav-demo/page.tsx` (after move)

**Interfaces:**
- Consumes: `getCurrentSession` for header login/me link; optional `createApiClient` on home
- Produces: `/`, `/products`, `/nav-demo`

- [ ] **Step 1: Add storefront layout**

```tsx
import type { ReactNode } from 'react'
import Link from 'next/link'
import { getCurrentSession } from '@/lib/server-customer'

/**
 * (storefront) zone layout — minimal header/footer (site IA A).
 * FrontPage Document + storefront.main ExperienceShell come in later milestones.
 */
export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession()

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              E
            </span>
            <span className="font-semibold tracking-tight">ERP Global</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-700">
            <Link href="/" className="hover:text-slate-900">
              首页
            </Link>
            <Link href="/products" className="hover:text-slate-900">
              产品
            </Link>
            <Link href="/nav-demo" className="hover:text-slate-900">
              导航演示
            </Link>
            {session.user ? (
              <Link href="/me" className="rounded-lg bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800">
                我的
              </Link>
            ) : (
              <Link href="/login?next=/me" className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">
                登录
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-6 py-8 text-sm text-slate-600">
          <span>© ERP Global</span>
          <Link href="/products" className="hover:text-slate-900">
            产品
          </Link>
          <Link href="/login" className="hover:text-slate-900">
            登录
          </Link>
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Move home to `(storefront)/page.tsx` and delete root `page.tsx`**

1. Read `apps/web/src/app/page.tsx`.
2. Write `apps/web/src/app/(storefront)/page.tsx` with the same body, but **remove** the inner top brand header row (layout already provides chrome). Keep hero + client cards + API check CTA.
3. Delete `apps/web/src/app/page.tsx`.

Minimal shape if rewriting:

```tsx
import { createApiClient } from '@erp/api-client'

const clients = [
  { name: 'Web', framework: 'Next.js 16', description: 'Global website, customer portal, SEO and localization.' },
  { name: 'Mobile', framework: 'Expo SDK 57', description: 'Native iOS and Android applications from one React codebase.' },
  { name: 'China', framework: 'Taro React 4', description: 'WeChat mini program and additional mainland channels.' },
]

export default function StorefrontHomePage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api/v1'
  const api = createApiClient({ baseUrl: apiUrl })

  return (
    <div className="bg-[radial-gradient(circle_at_top_left,#dbeafe_0,transparent_38%),linear-gradient(135deg,#f8fafc,#eef2ff)] px-6 py-12 sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col items-start gap-7">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
            Laravel API · One source of truth
          </span>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
            One ERP platform, built for every market.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            A production-ready foundation for the web, native mobile apps, and China&apos;s mini-program
            ecosystem—connected through a versioned Laravel API.
          </p>
          <a
            href={api.url('/health')}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
          >
            Check API
          </a>
        </div>
        <div className="grid gap-4">
          {clients.map((client) => (
            <article
              key={client.name}
              className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-900/5 backdrop-blur"
            >
              <p className="text-xs font-bold tracking-[0.18em] text-blue-600 uppercase">{client.name}</p>
              <h2 className="mt-2 text-lg font-semibold">{client.framework}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{client.description}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Products stub**

Create `apps/web/src/app/(storefront)/products/page.tsx`:

```tsx
export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">产品</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        产品列表将由 Mall / module views 接入。M0.5 仅占位，确认 `(storefront)` 路由树可用。
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Move nav-demo**

```bash
mkdir -p apps/web/src/app/\(storefront\)/nav-demo
git mv apps/web/src/app/\(desktop\)/nav-demo/page.tsx apps/web/src/app/\(storefront\)/nav-demo/page.tsx
```

Update the comment path from desktop to storefront.

- [ ] **Step 5: Confirm no root `page.tsx`**

Run: `test ! -f apps/web/src/app/page.tsx && echo 'root page gone'`

Expected: `root page gone`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(storefront\)
git add -u apps/web/src/app/page.tsx apps/web/src/app/\(desktop\)
git commit -m "$(cat <<'EOF'
feat(web): add (storefront) zone with home, products stub, nav-demo

EOF
)"
```

---

### Task 5: Delete remaining device route groups

**Files:**
- Delete: `apps/web/src/app/(desktop)/**`
- Delete: `apps/web/src/app/(tablet)/**`
- Delete: `apps/web/src/app/(mobile)/**`

**Interfaces:**
- Produces: filesystem state that satisfies `check:zones`

- [ ] **Step 1: Remove empty device groups**

```bash
rm -rf apps/web/src/app/\(desktop\) apps/web/src/app/\(tablet\) apps/web/src/app/\(mobile\)
```

- [ ] **Step 2: Run zone guard — expect PASS**

Run: `npm --prefix apps/web run check:zones`

Expected: `assert-site-zones: OK`

- [ ] **Step 3: Commit**

```bash
git add -u apps/web/src/app
git commit -m "$(cat <<'EOF'
chore(web): remove parallel (desktop)/(tablet)/(mobile) route groups

EOF
)"
```

---

### Task 6: Verification — lint, typecheck, build

**Files:**
- Touch only if build reveals import path fixes under `apps/web/src/lib/front-nav.ts` or comments in `apps/web/src/app/layout.tsx`

**Interfaces:**
- Consumes: completed zone tree + linked `@erp/front-nav`
- Produces: green `check:zones`, `lint`, `typecheck`, `next build`

- [ ] **Step 1: Zones**

Run: `npm --prefix apps/web run check:zones`  
Expected: OK

- [ ] **Step 2: Lint**

Run: `npm --prefix apps/web run lint`  
Expected: exit 0 (fix any new issues introduced by this milestone only)

- [ ] **Step 3: Typecheck**

Run: `npm --prefix apps/web run typecheck`  
Expected: exit 0

- [ ] **Step 4: Production build**

Run: `NEXT_TELEMETRY_DISABLED=1 npm --prefix apps/web run build`

Expected:
- **No** error `You cannot have two parallel pages that resolve to the same path`
- **No** `Module not found: Can't resolve '@erp/front-nav/core'`
- Build completes successfully (exit 0)

If build fails on an unrelated pre-existing issue, stop and report; do not expand scope past M0.5 unless the failure is caused by this migration.

- [ ] **Step 5: Optional comment sync on L0**

In `apps/web/src/app/layout.tsx`, if comments still say “C5 DeviceProvider” only, add one line pointing to site zones `(storefront)/(account)/(auth)` — no behavior change.

- [ ] **Step 6: Commit verification fixes if any**

```bash
git add -u apps/web
git commit -m "$(cat <<'EOF'
fix(web): green build after M0.5 site zone migration

EOF
)"
```

---

### Task 7: Mark M0.5 done in architecture checklist (docs only)

**Files:**
- Modify: `docs/dev-laraval/architecture/web-frontend.md` §15 row **M0.5** — append `（代码已落地）` or check a nearby note
- Modify: `docs/dev-laraval/superpowers/specs/2026-10-02-web-frontend-site-ia-design.md` §11 — tick items that docs+code now satisfy for route tree existence (only those truly done)

- [ ] **Step 1: Update milestone note**

In `web-frontend.md` §15, change M0.5 action cell to include done marker, e.g.:

`删除平行 device page；落地 (storefront)/(account)/(auth) 骨架；check:zones + next build 绿 — **done**`

- [ ] **Step 2: Tick site-IA acceptance items that are now true**

Only tick:
- route tree / FrontNav location mapping consistency in docs (already)
- code has the three zones (after Tasks 3–5)

Do **not** tick FrontPage homepage Document or full FrontNav-driven menus (not in M0.5).

- [ ] **Step 3: Commit docs**

```bash
git add docs/dev-laraval/architecture/web-frontend.md docs/dev-laraval/superpowers/specs/2026-10-02-web-frontend-site-ia-design.md
git commit -m "$(cat <<'EOF'
docs(web): mark M0.5 site zones as implemented

EOF
)"
```

---

## Out of scope (next plans)

- M1: `packages/{config,devices}` scaffolding
- M2: real DeviceShell + cmdk
- FrontPage Document on `/`
- Replacing hardcoded account/storefront nav with live FrontNav in layouts
- Products real data / `[id]` detail page
- Implementing site IA alternatives B or C

## Self-review

| Spec requirement | Task |
|---|---|
| No parallel device pages | 1, 5, 6 |
| `(storefront)/(account)/(auth)` | 3, 4, auth unchanged |
| `/` only under storefront | 4 (delete root page) |
| `/me` under account | 3 |
| front-nav resolvable for nav-demo | 2, 6 |
| B/C not implemented | Global Constraints |
| Docs milestone note | 7 |

Placeholder scan: none intentional.  
Type/path names: `(storefront)`, `(account)`, `(auth)`, `check:zones`, `assert-site-zones.mjs` used consistently.
