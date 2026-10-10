import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nav } from '../src/nav.ts'

test('users nav requires auth on account paths', () => {
  const byId = Object.fromEntries(nav.map((item) => [item.id, item]))
  assert.equal(byId.me.path, '/me')
  assert.equal(byId.me.requireAuth, true)
  assert.equal(byId.settings.path, '/me/settings')
  assert.equal(byId.security.path, '/me/security')
})
