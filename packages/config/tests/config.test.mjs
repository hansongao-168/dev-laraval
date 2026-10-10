import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyViewportWidth } from '../src/breakpoints.ts'
import { aggregateNav, routes } from '../src/routes.ts'

test('classifyViewportWidth maps architecture breakpoints', () => {
  assert.equal(classifyViewportWidth(320), 'mobile')
  assert.equal(classifyViewportWidth(767), 'mobile')
  assert.equal(classifyViewportWidth(768), 'tablet')
  assert.equal(classifyViewportWidth(1279), 'tablet')
  assert.equal(classifyViewportWidth(1280), 'desktop')
})

test('aggregateNav flattens groups and sorts by priority descending', () => {
  const items = aggregateNav([
    [{ id: 'help', labelKey: 'help', path: '/help', frame: 'empty', priority: 10 }],
    [
      { id: 'home', labelKey: 'home', path: '/', frame: 'empty' },
      { id: 'products', labelKey: 'products', path: '/products', frame: 'list', priority: 200 },
    ],
  ])

  assert.deepEqual(
    items.map((item) => item.id),
    ['products', 'home', 'help'],
  )
})

test('config routes stay empty so modules own business nav', () => {
  assert.deepEqual(routes, [])
})
