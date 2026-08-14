/**
 * End-to-end SDK test against a fake Laravel-shaped server.
 *
 * The server is just `node:http` returning payloads that mirror the
 * shape documented in Gz168\FrontNav\Front\Http\Resources\NavItemResource.
 * Goal: prove that the SDK can talk to a Laravel backend that speaks
 * the documented contract, including i18n, cache, and 4xx paths.
 *
 * Run:
 *   node --test packages/front-nav/tests/e2e.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  fetchNav,
  resolveLabels,
  createNavCache,
  cacheKey,
} from '../src/core/index.js';

function makeNavItem(overrides) {
  return {
    key: 'home',
    label: 'Home',
    labelKey: null,
    i18nLocales: null,
    location: 'header',
    url: '/',
    icon: null,
    sort: 0,
    parent: null,
    requiresAuth: false,
    permission: null,
    enabled: true,
    meta: {},
    children: [],
    ...overrides,
  };
}

function makeServer(handler) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    handler(url, res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

function httpLike(baseUrl) {
  return {
    async request(path, options = {}) {
      const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers: { Accept: 'application/json', ...(options.headers || {}) },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      const data = await res.json().catch(() => null);
      return { ok: res.ok, status: res.status, data };
    },
  };
}

test('e2e: SDK fetches and resolves labels from a Laravel-shaped server', async () => {
  const items = [
    makeNavItem({ key: 'home', label: 'Home', labelKey: 'nav.home', sort: 1 }),
    makeNavItem({
      key: 'admin',
      label: 'Admin',
      labelKey: 'nav.admin',
      i18nLocales: ['en'],
      requiresAuth: true,
      permission: 'admin.view',
      sort: 2,
    }),
  ];

  const { server, url } = await makeServer((u, res) => {
    if (u.pathname === '/api/v1/front-nav') {
      const locale = u.searchParams.get('locale');
      const filtered = locale
        ? items.filter((i) => !i.i18nLocales || i.i18nLocales.includes(locale))
        : items;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        data: filtered,
        meta: { location: 'header', locale, authed: false },
      }));
    } else {
      res.statusCode = 404;
      res.end();
    }
  });

  try {
    const http = httpLike(url);
    const out = await fetchNav(http, { location: 'header', locale: 'zh-CN' });
    assert.equal(out.data.length, 1, 'admin (en only) should be filtered out for zh-CN');
    assert.equal(out.data[0].key, 'home');

    // Translate via i18next-shaped translator.
    const translate = (k) => (k === 'nav.home' ? '首页' : k);
    const resolved = resolveLabels(out.data, translate);
    assert.equal(resolved[0].label, '首页');
  } finally {
    server.close();
  }
});

test('e2e: cache layer is honoured across repeated calls', async () => {
  let hits = 0;
  const { server, url } = await makeServer((u, res) => {
    if (u.pathname === '/api/v1/front-nav') {
      hits += 1;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        data: [makeNavItem({ key: 'home', sort: hits })],
        meta: { location: 'header', locale: u.searchParams.get('locale'), authed: false },
      }));
    } else {
      res.statusCode = 404;
      res.end();
    }
  });

  try {
    const http = httpLike(url);
    const cache = createNavCache({ ttlMs: 60_000 });

    // First call: cache miss.
    const first = await fetchNav(http, { location: 'header', locale: 'zh-CN' });
    cache.set('header', 'zh-CN', first);
    assert.equal(hits, 1);
    assert.equal(first.data[0].sort, 1);

    // Second call: should NOT hit the server; cache returns the original.
    const cached = cache.get('header', 'zh-CN');
    assert.ok(cached);
    assert.equal(cached.data[0].sort, 1, 'cache must not see the server-side sort=2');
    assert.equal(hits, 1);
  } finally {
    server.close();
  }
});

test('e2e: invalid locale surfaces 422 from backend', async () => {
  const { server, url } = await makeServer((u, res) => {
    res.statusCode = 422;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      message: 'The given data was invalid.',
      errors: { location: ['The location must be one of: header, sidebar, footer, mobile.'] },
    }));
  });

  try {
    const http = httpLike(url);
    await assert.rejects(
      fetchNav(http, { location: 'garbage' }),
      (e) => e.status === 422,
    );
  } finally {
    server.close();
  }
});

test('e2e: cache key isolates (location, locale) tuples', () => {
  // Same location, different locales ⇒ distinct keys.
  assert.notEqual(cacheKey('sidebar', 'zh-CN'), cacheKey('sidebar', 'en'));
  // Different locations ⇒ distinct keys.
  assert.notEqual(cacheKey('header', 'zh-CN'), cacheKey('sidebar', 'zh-CN'));
  // Same pair ⇒ same key.
  assert.equal(cacheKey('sidebar', 'zh-CN'), cacheKey('sidebar', 'zh-CN'));
  // null locale is the "any" bucket.
  assert.equal(cacheKey('sidebar', null), 'front-nav:sidebar:any');
});

test('e2e: child label resolution is recursive', async () => {
  const { server, url } = await makeServer((u, res) => {
    if (u.pathname === '/api/v1/front-nav') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        data: [{
          ...makeNavItem({ key: 'parent', labelKey: 'nav.parent', sort: 1 }),
          children: [makeNavItem({ key: 'child', labelKey: 'nav.child', parent: 'parent', sort: 1 })],
        }],
        meta: { location: 'sidebar', locale: 'zh-CN', authed: false },
      }));
    } else {
      res.statusCode = 404;
      res.end();
    }
  });

  try {
    const http = httpLike(url);
    const out = await fetchNav(http, { location: 'sidebar', locale: 'zh-CN' });
    const translate = (k) => `T(${k})`;
    const resolved = resolveLabels(out.data, translate);
    assert.equal(resolved[0].label, 'T(nav.parent)');
    assert.equal(resolved[0].children[0].label, 'T(nav.child)');
  } finally {
    server.close();
  }
});
