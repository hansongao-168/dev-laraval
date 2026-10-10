import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nav } from '../src/nav.ts'

test('storefront nav declares home products and nav-demo', () => {
  const byId = Object.fromEntries(nav.map((item) => [item.id, item]))
  assert.equal(byId.home.path, '/')
  assert.equal(byId.home.frame, 'workspace')
  assert.equal(byId.products.path, '/products')
  assert.equal(byId['nav-demo'].path, '/nav-demo')
})
