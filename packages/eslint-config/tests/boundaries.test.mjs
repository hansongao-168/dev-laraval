import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyFile, classifyImport, forbiddenReason } from '../src/boundaries.js'

test('classifyFile maps architecture layers', () => {
  assert.equal(classifyFile('/repo/apps/web/src/app/page.tsx').layer, 'app')
  assert.equal(classifyFile('/repo/modules/auth/src/index.ts').layer, 'module')
  assert.equal(classifyFile('/repo/modules/auth/src/index.ts').moduleId, 'auth')
  assert.equal(classifyFile('/repo/packages/config/src/index.ts').layer, 'config')
  assert.equal(classifyFile('/repo/packages/ui/src/index.ts').layer, 'ui')
  assert.equal(classifyFile('/repo/packages/devices/src/react.tsx').layer, 'devices')
  assert.equal(classifyFile('/repo/packages/api-client/src/index.js').layer, 'api-client')
})

test('classifyImport maps package names and relative paths', () => {
  assert.equal(classifyImport('next/navigation', '/repo/modules/auth/src/a.ts').layer, 'next')
  assert.equal(classifyImport('@erp/module-users', '/repo/modules/auth/src/a.ts').moduleId, 'users')
  assert.equal(
    classifyImport('../views/login', '/repo/modules/auth/src/index.ts').layer,
    'module',
  )
  assert.equal(
    classifyImport('../../../packages/config/src/index.ts', '/repo/modules/auth/src/index.ts').layer,
    'config',
  )
})

test('forbiddenReason allows documented edges', () => {
  assert.equal(
    forbiddenReason('/repo/apps/web/src/app/page.tsx', '@erp/module-auth'),
    null,
  )
  assert.equal(
    forbiddenReason('/repo/modules/auth/src/index.ts', '@erp/config'),
    null,
  )
  assert.equal(
    forbiddenReason('/repo/modules/storefront/src/index.ts', '@erp/front-experience'),
    null,
  )
  assert.equal(
    forbiddenReason('/repo/packages/ui/src/index.ts', '@erp/config'),
    null,
  )
  assert.equal(
    forbiddenReason('/repo/packages/api-client/src/index.js', '@erp/config'),
    null,
  )
  assert.equal(
    forbiddenReason('/repo/modules/auth/src/index.ts', './views/login'),
    null,
  )
})

test('forbiddenReason blocks documented violations', () => {
  assert.match(
    forbiddenReason('/repo/modules/auth/src/index.ts', 'next') ?? '',
    /next/,
  )
  assert.match(
    forbiddenReason('/repo/modules/auth/src/index.ts', '@erp/module-users') ?? '',
    /modules\/users/,
  )
  assert.match(
    forbiddenReason('/repo/packages/ui/src/index.ts', '@erp/devices') ?? '',
    /devices/,
  )
  assert.match(
    forbiddenReason('/repo/packages/config/src/index.ts', '@erp/ui') ?? '',
    /ui/,
  )
  assert.match(
    forbiddenReason('/repo/packages/devices/src/index.ts', '@erp/ui') ?? '',
    /ui/,
  )
})
