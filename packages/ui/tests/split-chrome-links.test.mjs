import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitChromeLinks } from '../src/chrome.ts'

test('splitChromeLinks keeps all items when at or under the limit', () => {
  const items = [
    { key: 'a', href: '/a', label: 'A' },
    { key: 'b', href: '/b', label: 'B' },
  ]
  assert.deepEqual(splitChromeLinks(items, 4), { primary: items, more: [] })
})

test('splitChromeLinks puts overflow into more', () => {
  const items = ['a', 'b', 'c', 'd', 'e'].map((key) => ({
    key,
    href: `/${key}`,
    label: key,
  }))
  const { primary, more } = splitChromeLinks(items, 4)
  assert.deepEqual(
    primary.map((item) => item.key),
    ['a', 'b', 'c', 'd'],
  )
  assert.deepEqual(
    more.map((item) => item.key),
    ['e'],
  )
})
