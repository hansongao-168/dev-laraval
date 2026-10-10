import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveActiveNav } from '../src/nav-resolve.ts'

const items = [
  { id: 'home', labelKey: 'home', path: '/', frame: 'workspace' },
  { id: 'me', labelKey: 'me', path: '/me', frame: 'detail' },
  { id: 'settings', labelKey: 'settings', path: '/me/settings', frame: 'empty' },
]

test('resolveActiveNav prefers exact then longest prefix', () => {
  assert.equal(resolveActiveNav(items, '/').id, 'home')
  assert.equal(resolveActiveNav(items, '/me').id, 'me')
  assert.equal(resolveActiveNav(items, '/me/settings').id, 'settings')
  assert.equal(resolveActiveNav(items, '/unknown'), null)
})
