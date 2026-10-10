import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FRAME_IDS } from '../../config/src/frame-ids.ts'

test('FRAME_IDS lists every L2 frame', () => {
  assert.deepEqual(FRAME_IDS, ['list', 'detail', 'auth', 'workspace', 'empty'])
})
