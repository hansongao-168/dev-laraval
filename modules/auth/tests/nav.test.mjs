import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nav } from '../src/nav.ts'

test('auth nav declares login and register frames', () => {
  const byId = Object.fromEntries(nav.map((item) => [item.id, item]))
  assert.equal(byId.login.path, '/login')
  assert.equal(byId.login.frame, 'auth')
  assert.equal(byId.register.path, '/register')
  assert.equal(byId['forgot-password'].path, '/forgot-password')
})
