/**
 * Package `exports` resolution test.
 *
 * Verifies that the package's `exports` map (see package.json) resolves
 * correctly for every declared subpath, using Node's own module resolver
 * via self-reference. This is the same resolution strategy bundlers
 * (Turbopack, webpack, Metro, Vite) use, so passing here is a strong
 * signal that a production build can import the SDK.
 *
 * Run:
 *   npm run test:exports
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const EXPECTED_CORE = ['fetchNav', 'FrontNavError', 'createNavCache', 'cacheKey', 'resolveLabels', 'resolveLabel'];

test('exports: package root "." resolves all core symbols', async () => {
  const m = await import('@erp/front-nav');
  for (const k of EXPECTED_CORE) {
    assert.equal(typeof m[k], 'function', `root export "${k}" must be a function`);
  }
});

test('exports: "./core" subpath resolves all core symbols', async () => {
  const m = await import('@erp/front-nav/core');
  for (const k of EXPECTED_CORE) {
    assert.equal(typeof m[k], 'function', `./core export "${k}" must be a function`);
  }
});

test('exports: "./core/fetch" subpath resolves', async () => {
  const m = await import('@erp/front-nav/core/fetch');
  assert.equal(typeof m.fetchNav, 'function');
});

test('exports: "./core/cache" subpath resolves', async () => {
  const m = await import('@erp/front-nav/core/cache');
  assert.equal(typeof m.createNavCache, 'function');
  assert.equal(typeof m.cacheKey, 'function');
});

test('exports: "./core/labels" subpath resolves', async () => {
  const m = await import('@erp/front-nav/core/labels');
  assert.equal(typeof m.resolveLabels, 'function');
  assert.equal(typeof m.resolveLabel, 'function');
});

test('exports: "./react" subpath resolves useFrontNav', async () => {
  const m = await import('@erp/front-nav/react');
  assert.equal(typeof m.useFrontNav, 'function');
});
