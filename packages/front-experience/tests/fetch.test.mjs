import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchFrontPageDocument, mainBlocks } from '../src/fetch.ts'

test('fetchFrontPageDocument returns document on ok response', async () => {
  const document = { shell: { slots: { main: [{ type: 'mall.product-grid' }] } } }
  const http = {
    async request() {
      return { ok: true, status: 200, data: { data: { document } } }
    },
  }

  assert.deepEqual(await fetchFrontPageDocument(http, 'home', 'mobile'), document)
  assert.equal(mainBlocks(document).length, 1)
})

test('fetchFrontPageDocument returns null on failure', async () => {
  const http = {
    async request() {
      return { ok: false, status: 500, data: {} }
    },
  }

  assert.equal(await fetchFrontPageDocument(http, 'home'), null)
  assert.deepEqual(mainBlocks(null), [])
})
