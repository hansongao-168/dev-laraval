import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('assert-site-zones exits 0', () => {
  const result = spawnSync(process.execPath, ['./scripts/assert-site-zones.mjs'], {
    cwd: root,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /assert-site-zones: OK/)
})
