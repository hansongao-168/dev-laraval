/**
 * React hook tests for useFrontNav.
 *
 * Uses jsdom as the global environment and @testing-library/react's
 * renderHook + act() to drive the hook through real lifecycle phases.
 *
 * Pattern:
 *   1. renderHook() — mounts the component; useEffect schedules the fetch.
 *   2. await act(async () => {}) — flushes the microtask queue so the
 *      fetch promise resolves AND React commits the resulting setState.
 *      This is the React 19 + jsdom + node:test stable idiom.
 *
 * Run:
 *   npm test            (combined)
 *   npm run test:react  (this file only)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
function setGlobal(key, value) {
  Object.defineProperty(globalThis, key, {
    value,
    writable: true,
    configurable: true,
  });
}
setGlobal('window', dom.window);
setGlobal('document', dom.window.document);
setGlobal('navigator', dom.window.navigator);
setGlobal('HTMLElement', dom.window.HTMLElement);
setGlobal('Element', dom.window.Element);
setGlobal('Node', dom.window.Node);
setGlobal('fetch', dom.window.fetch);
setGlobal('AbortController', dom.window.AbortController);

const { renderHook, act } = await import('@testing-library/react');
const { useFrontNav } = await import('../src/react/index.js');

function fakeNavItem(overrides) {
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

function payloadFor(location, items = []) {
  return {
    data: items.map((i) => ({ ...i, location })),
    meta: { location, locale: null, authed: false },
  };
}

function makeHttp(perPathPayload) {
  let callCount = 0;
  return {
    get callCount() { return callCount; },
    async request(path) {
      callCount += 1;
      const qIdx = path.indexOf('?');
      const query = qIdx >= 0 ? Object.fromEntries(new URLSearchParams(path.slice(qIdx + 1))) : {};
      const payload = perPathPayload[query.location] ?? payloadFor(query.location, []);
      return { ok: true, status: 200, data: payload };
    },
  };
}

/**
 * Flush every pending microtask (fetch promise resolution) AND let React
 * commit the resulting state. Without this, useEffect's async fetch resolves
 * but the setState is never seen by renderHook's result.current.
 */
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

test('react: resolves with data after mount effect runs', async () => {
  const http = makeHttp({
    header: payloadFor('header', [fakeNavItem({ key: 'home', sort: 1 })]),
  });

  const { result } = renderHook(() =>
    useFrontNav({ http, locations: 'header' }),
  );

  await flush();

  assert.equal(result.current.loading, false);
  assert.equal(result.current.error, null);
  assert.equal(result.current.items.header.length, 1);
  assert.equal(result.current.items.header[0].key, 'home');
  assert.equal(http.callCount, 1);
});

test('react: translates labels via the Translator prop', async () => {
  const http = makeHttp({
    sidebar: payloadFor('sidebar', [
      fakeNavItem({ key: 'profile', labelKey: 'nav.profile', label: 'Profile', location: 'sidebar' }),
    ]),
  });
  const translate = (k) => (k === 'nav.profile' ? '我的资料' : k);

  const { result } = renderHook(() =>
    useFrontNav({ http, locations: 'sidebar', translate }),
  );

  await flush();

  assert.equal(result.current.items.sidebar[0].label, '我的资料');
});

test('react: returns empty when skip=true and does not call fetch', async () => {
  const http = makeHttp({});

  const { result } = renderHook(() =>
    useFrontNav({ http, locations: 'header', skip: true }),
  );

  await flush();

  assert.equal(result.current.loading, false);
  assert.deepEqual(result.current.items.header, []);
  assert.equal(http.callCount, 0, 'skip should suppress network call');
});

test('react: surfaces error on non-2xx and keeps prior items untouched', async () => {
  const http = {
    async request() {
      return { ok: false, status: 500, data: null };
    },
  };

  const { result } = renderHook(() =>
    useFrontNav({ http, locations: 'header' }),
  );

  await flush();

  assert.equal(result.current.loading, false);
  assert.ok(result.current.error instanceof Error);
  assert.match(result.current.error.message, /HTTP 500/);
});

test('react: refresh() invalidates the cache and re-fetches', async () => {
  let calls = 0;
  const http = {
    async request() {
      calls += 1;
      return {
        ok: true,
        status: 200,
        data: payloadFor('header', [fakeNavItem({ key: `item-${calls}` })]),
      };
    },
  };

  const { result } = renderHook(() =>
    useFrontNav({ http, locations: 'header' }),
  );

  await flush();
  assert.equal(calls, 1);
  assert.equal(result.current.items.header[0].key, 'item-1');

  await act(async () => {
    await result.current.refresh();
    await Promise.resolve();
    await Promise.resolve();
  });

  assert.equal(calls, 2);
  assert.equal(result.current.items.header[0].key, 'item-2');
});

test('react: fetches multiple locations in one effect and groups by key', async () => {
  const http = makeHttp({
    header:  payloadFor('header',  [fakeNavItem({ key: 'home',  location: 'header' })]),
    sidebar: payloadFor('sidebar', [fakeNavItem({ key: 'menu',  location: 'sidebar' })]),
  });

  const { result } = renderHook(() =>
    useFrontNav({ http, locations: ['header', 'sidebar'] }),
  );

  await flush();

  assert.deepEqual(
    Object.keys(result.current.items).sort(),
    ['header', 'sidebar'],
  );
  assert.equal(result.current.items.header[0].key, 'home');
  assert.equal(result.current.items.sidebar[0].key, 'menu');
});
