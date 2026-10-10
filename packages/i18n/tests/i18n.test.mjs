import assert from 'node:assert/strict'
import test from 'node:test'
import { createTranslator, mergeMessages } from '../src/index.ts'

test('createTranslator returns key when missing and interpolates vars', () => {
  const t = createTranslator({ 'hello.name': '你好，{name}' })
  assert.equal(t('hello.name', { name: 'Ada' }), '你好，Ada')
  assert.equal(t('missing.key'), 'missing.key')
})

test('mergeMessages later dicts win', () => {
  assert.deepEqual(mergeMessages({ a: '1', b: '2' }, { b: '3' }), { a: '1', b: '3' })
})
