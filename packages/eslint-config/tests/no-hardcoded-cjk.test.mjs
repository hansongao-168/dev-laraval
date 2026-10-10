import assert from 'node:assert/strict'
import test from 'node:test'
import { hasCjk, isAllowedCjkPath } from '../src/no-hardcoded-cjk.js'

test('hasCjk detects Chinese characters', () => {
  assert.equal(hasCjk('登录'), true)
  assert.equal(hasCjk('Login'), false)
  assert.equal(hasCjk('ERP Global'), false)
})

test('isAllowedCjkPath allows messages and tests', () => {
  assert.equal(isAllowedCjkPath('/repo/modules/auth/src/messages/zh-CN.ts'), true)
  assert.equal(isAllowedCjkPath('/repo/packages/i18n/tests/i18n.test.mjs'), true)
  assert.equal(isAllowedCjkPath('/repo/modules/auth/src/views/login-view.tsx'), false)
})
