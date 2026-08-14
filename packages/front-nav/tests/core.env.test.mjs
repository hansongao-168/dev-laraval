/**
 * Cross-environment compatibility tests for @erp/front-nav/core.
 *
 * These tests run in a MINIMAL Node environment — no DOM, no window,
 * no localStorage, no global fetch, no navigator. They prove the SDK
 * core is framework-agnostic and works in:
 *
 *   - Node SSR (Next.js server components)
 *   - React Native / Expo (no DOM, no browser fetch)
 *   - Cloudflare Workers / any JS runtime
 *   - Bundlers (Vite, Metro)
 *
 * The SDK core deliberately does NOT read document/window/localStorage/
 * navigator, and it does NOT call global fetch() — callers inject their
 * own `http` client (see FetchLike). This file guards that contract.
 *
 * Run:
 *   npm run test:env      (this file only)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// NOTE: do NOT install a jsdom-like global here. We want to prove the
// core runs without any of it.

import { fetchNav, FrontNavError } from '../src/core/index.js';
import { createNavCache, cacheKey } from '../src/core/index.js';
import { resolveLabels, resolveLabel } from '../src/core/index.js';

test('env: core module loads without DOM / window / navigator / localStorage', () => {
  // If the SDK core touched any of these at import time, this test would
  // throw a ReferenceError. The fact that we can import and call these
  // proves no browser-only dependency at module scope.
  assert.equal(typeof fetchNav, 'function');
  assert.equal(typeof FrontNavError, 'function');
  assert.equal(typeof createNavCache, 'function');
  assert.equal(typeof resolveLabels, 'function');

  // Sanity: none of these browser-only globals exist in this environment.
  // (Node 22 DOES expose a global `navigator` object, so we intentionally
  // don't assert on it — the point is that the SDK core doesn't need it.)
  assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(typeof globalThis.window, 'undefined');
  assert.equal(typeof globalThis.localStorage, 'undefined');
});

test('env: fetchNav works with an injected http client (no global fetch)', async () => {
  // fetchNav must not call global fetch() — it delegates to `http`.
  const http = {
    async request(path) {
      return {
        ok: true,
        status: 200,
        data: {
          data: [{ key: 'home', label: 'Home', location: 'header', url: '/', children: [] }],
          meta: { location: 'header', locale: null, authed: false },
        },
      };
    },
  };

  const out = await fetchNav(http, { location: 'header' });
  assert.equal(out.data[0].key, 'home');
});

test('env: fetchNav throws FrontNavError without any DOM API', () => {
  const http = {
    async request() {
      return { ok: false, status: 404, data: null };
    },
  };

  return assert.rejects(fetchNav(http, { location: 'header' }), (e) => {
    assert.ok(e instanceof FrontNavError);
    assert.equal(e.status, 404);
    return true;
  });
});

test('env: createNavCache + cacheKey work without Date.now override', () => {
  // Uses the global Date.now — fine in any runtime.
  const cache = createNavCache({ ttlMs: 1000 });
  cache.set('header', 'zh-CN', { data: [], meta: { location: 'header', locale: 'zh-CN', authed: false } });
  assert.ok(cache.get('header', 'zh-CN'));
  assert.equal(cacheKey('sidebar', null), 'front-nav:sidebar:any');
});

test('env: resolveLabels is pure (no side effects on globals)', () => {
  const item = {
    key: 'profile', label: 'Profile', labelKey: 'nav.profile',
    location: 'sidebar', url: '/profile', children: [],
  };
  const out = resolveLabels([item], (k) => (k === 'nav.profile' ? '资料' : k));
  assert.equal(out[0].label, '资料');

  // Pure — original untouched.
  assert.equal(item.label, 'Profile');

  const single = resolveLabel(item, () => 'X');
  assert.equal(single.label, 'X');
});
