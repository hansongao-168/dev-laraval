import { test } from 'node:test'
import assert from 'node:assert/strict'
import { asRecords, stringProp } from '../src/block-utils.ts'
import { createBlockRegistry, renderBlock } from '../src/registry.ts'

test('asRecords unwraps arrays and common envelopes', () => {
  assert.deepEqual(asRecords([{ id: 1 }]), [{ id: 1 }])
  assert.deepEqual(asRecords({ data: [{ id: 2 }] }), [{ id: 2 }])
  assert.deepEqual(asRecords({ items: [{ id: 3 }] }), [{ id: 3 }])
  assert.deepEqual(asRecords(null), [])
})

test('stringProp returns first non-empty string', () => {
  assert.equal(stringProp({ title: 'A', name: 'B' }, ['name', 'title']), 'B')
  assert.equal(stringProp({ title: 'A' }, ['missing', 'title']), 'A')
  assert.equal(stringProp({}, ['title']), '')
})

test('createBlockRegistry resolves registered types and falls back', () => {
  const registry = createBlockRegistry({
    'mall.product-grid': ({ block }) => `grid:${block.type}`,
  })

  assert.deepEqual(registry.types(), ['mall.product-grid'])
  assert.equal(
    renderBlock(registry, { type: 'mall.product-grid' }, () => 'fallback'),
    'grid:mall.product-grid',
  )
  assert.equal(
    renderBlock(registry, { type: 'unknown.block' }, ({ block }) => `miss:${block.type}`),
    'miss:unknown.block',
  )
})
