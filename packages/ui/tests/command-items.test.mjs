import { test } from 'node:test'
import assert from 'node:assert/strict'
import { commandsVisibleOnDevice, labelFromKey, navItemsToCommands } from '../src/command/to-commands.ts'

test('labelFromKey humanizes nav keys', () => {
  assert.equal(labelFromKey('nav.home'), 'Home')
  assert.equal(labelFromKey('nav.forgotPassword'), 'Forgot Password')
})

test('navItemsToCommands flattens, drops empty paths, sorts by priority', () => {
  const commands = navItemsToCommands([
    {
      id: 'home',
      labelKey: 'nav.home',
      path: '/',
      frame: 'workspace',
      priority: 10,
      children: [
        { id: 'hidden', labelKey: 'nav.hidden', path: '', frame: 'empty', priority: 999 },
        { id: 'products', labelKey: 'nav.products', path: '/products', frame: 'list', priority: 200 },
      ],
    },
  ])

  assert.deepEqual(
    commands.map((item) => item.id),
    ['products', 'home'],
  )
  assert.equal(commands[0]?.label, 'Products')
})

test('commandsVisibleOnDevice respects deviceVisibility', () => {
  const items = [
    { id: 'all', labelKey: 'nav.all', path: '/', frame: 'workspace' },
    {
      id: 'desktop-only',
      labelKey: 'nav.desktop',
      path: '/desktop',
      frame: 'empty',
      deviceVisibility: ['desktop'],
    },
  ]

  assert.deepEqual(
    commandsVisibleOnDevice(items, 'mobile').map((item) => item.id),
    ['all'],
  )
  assert.deepEqual(
    commandsVisibleOnDevice(items, 'desktop').map((item) => item.id),
    ['all', 'desktop-only'],
  )
})
