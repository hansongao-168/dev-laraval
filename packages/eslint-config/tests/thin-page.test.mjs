import assert from 'node:assert/strict'
import test from 'node:test'
import { countPageLines, matchesAny } from '../src/thin-page.js'

test('countPageLines counts physical lines', () => {
  assert.equal(countPageLines('a\nb\n'), 3)
  assert.equal(countPageLines(''), 0)
  assert.equal(countPageLines('single'), 1)
})

test('matchesAny finds document whitelist paths', () => {
  assert.equal(
    matchesAny('/repo/apps/web/src/app/(storefront)/page.tsx', ['/app/(storefront)/page.tsx']),
    true,
  )
  assert.equal(
    matchesAny('/repo/apps/web/src/app/(auth)/login/page.tsx', ['/app/(storefront)/page.tsx']),
    false,
  )
})
