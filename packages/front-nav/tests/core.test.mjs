/**
 * Smoke tests for @erp/front-nav/core. Run via:
 *
 *     node --test packages/front-nav/tests/core.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchNav,
  FrontNavError,
  createNavCache,
  cacheKey,
  resolveLabels,
} from '../src/core/index.js';

const fakeResponse = (status, data) => ({
  ok: status >= 200 && status < 300,
  status,
  data,
});

const okHttp = (payload) => ({
  async request(path) {
    return fakeResponse(200, payload);
  },
  _calledWith: null,
});

test('fetchNav returns parsed response on success', async () => {
  const payload = {
    data: [{ key: 'home', label: 'Home', labelKey: null, i18nLocales: null, location: 'header', url: '/', icon: null, sort: 0, parent: null, requiresAuth: false, permission: null, enabled: true, meta: {}, children: [] }],
    meta: { location: 'header', locale: 'zh-CN', authed: false },
  };
  const http = okHttp(payload);
  const out = await fetchNav(http, { location: 'header', locale: 'zh-CN' });
  assert.equal(out.data.length, 1);
  assert.equal(out.data[0].key, 'home');
});

test('fetchNav throws on non-2xx', async () => {
  const http = { async request() { return fakeResponse(503, null); } };
  await assert.rejects(fetchNav(http, { location: 'header' }), (e) => {
    assert.ok(e instanceof FrontNavError);
    assert.equal(e.status, 503);
    return true;
  });
});

test('fetchNav throws on malformed payload', async () => {
  const http = okHttp({ wrong: 'shape' });
  await assert.rejects(fetchNav(http, { location: 'header' }), FrontNavError);
});

test('cacheKey formats location + locale', () => {
  assert.equal(cacheKey('sidebar', 'zh-CN'), 'front-nav:sidebar:zh-CN');
  assert.equal(cacheKey('sidebar', null), 'front-nav:sidebar:any');
});

test('createNavCache stores and retrieves entries', () => {
  const c = createNavCache({ ttlMs: 1000 });
  c.set('header', 'zh-CN', { data: [], meta: { location: 'header', locale: 'zh-CN', authed: false } });
  assert.ok(c.get('header', 'zh-CN'));
  assert.equal(c.get('header', 'en'), undefined);
});

test('createNavCache expires after ttl', () => {
  let t = 0;
  const c = createNavCache({ ttlMs: 100, now: () => t });
  c.set('header', null, { data: [], meta: { location: 'header', locale: null, authed: false } });
  t = 50;
  assert.ok(c.get('header', null));
  t = 150;
  assert.equal(c.get('header', null), undefined);
});

test('createNavCache.invalidate(location) wipes only that location', () => {
  const c = createNavCache({ ttlMs: 10_000 });
  c.set('header', null, { data: [], meta: { location: 'header', locale: null, authed: false } });
  c.set('sidebar', null, { data: [], meta: { location: 'sidebar', locale: null, authed: false } });
  c.invalidate('header');
  assert.equal(c.get('header', null), undefined);
  assert.ok(c.get('sidebar', null));
});

test('resolveLabels translates labelKey and falls back when key returns itself', () => {
  const items = [
    {
      key: 'home',
      label: 'Home',
      labelKey: 'nav.home',
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
    },
    {
      key: 'about',
      label: 'About',
      labelKey: 'nav.about', // missing key
      i18nLocales: null,
      location: 'header',
      url: '/about',
      icon: null,
      sort: 1,
      parent: null,
      requiresAuth: false,
      permission: null,
      enabled: true,
      meta: {},
      children: [],
    },
  ];

  const translate = (k) => (k === 'nav.home' ? '首页' : k);
  const out = resolveLabels(items, translate);
  assert.equal(out[0].label, '首页');
  assert.equal(out[1].label, 'About'); // fallback
  // input untouched
  assert.equal(items[0].label, 'Home');
});

test('resolveLabels walks children recursively', () => {
  const parent = {
    key: 'parent',
    label: 'Parent',
    labelKey: 'nav.parent',
    i18nLocales: null,
    location: 'sidebar',
    url: '/p',
    icon: null,
    sort: 0,
    parent: null,
    requiresAuth: false,
    permission: null,
    enabled: true,
    meta: {},
    children: [
      {
        key: 'child',
        label: 'Child',
        labelKey: 'nav.child',
        i18nLocales: null,
        location: 'sidebar',
        url: '/p/c',
        icon: null,
        sort: 0,
        parent: 'parent',
        requiresAuth: false,
        permission: null,
        enabled: true,
        meta: {},
        children: [],
      },
    ],
  };
  const translate = (k) => `T(${k})`;
  const out = resolveLabels([parent], translate);
  assert.equal(out[0].label, 'T(nav.parent)');
  assert.equal(out[0].children[0].label, 'T(nav.child)');
});
