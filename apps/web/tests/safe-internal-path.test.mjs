import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeInternalPath } from '../src/lib/safe-internal-path.ts'

test('safeInternalPath rejects open redirects', () => {
  assert.equal(safeInternalPath('/me/settings'), '/me/settings')
  assert.equal(safeInternalPath('https://evil.test/phish'), '/me')
  assert.equal(safeInternalPath('//evil.test'), '/me')
  assert.equal(safeInternalPath('/login?next=/me'), '/me')
  assert.equal(safeInternalPath(undefined), '/me')
})
