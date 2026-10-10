import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inferInitialDeviceClass } from '../src/infer.ts'

test('inferInitialDeviceClass prefers Client Hints width', () => {
  assert.equal(
    inferInitialDeviceClass({ viewportWidthHeader: '390', userAgent: 'Mozilla/5.0 (Macintosh)' }),
    'mobile',
  )
  assert.equal(
    inferInitialDeviceClass({ viewportWidthHeader: '1400', userAgent: 'iPhone' }),
    'desktop',
  )
})

test('inferInitialDeviceClass falls back to UA then desktop', () => {
  assert.equal(
    inferInitialDeviceClass({ viewportWidthHeader: null, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0)' }),
    'tablet',
  )
  assert.equal(
    inferInitialDeviceClass({ viewportWidthHeader: null, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }),
    'mobile',
  )
  assert.equal(
    inferInitialDeviceClass({ viewportWidthHeader: null, userAgent: null }),
    'desktop',
  )
})
