import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  readCookieFromHeader,
  csrfHeadersFromCookieHeader,
  parseSetCookie,
} from '../src/core/cookie.js'
import { createHttp } from '../src/core/http.js'

test('readCookieFromHeader decodes Laravel XSRF-TOKEN', () => {
  const header = 'laravel_session=abc; XSRF-TOKEN=token%3Dvalue'
  assert.equal(readCookieFromHeader(header, 'XSRF-TOKEN'), 'token=value')
  assert.deepEqual(csrfHeadersFromCookieHeader(header), { 'X-XSRF-TOKEN': 'token=value' })
})

test('parseSetCookie maps HttpOnly SameSite Path', () => {
  const parsed = parseSetCookie('XSRF-TOKEN=a%3Db; Path=/; HttpOnly; SameSite=Lax; Max-Age=7200')
  assert.equal(parsed.name, 'XSRF-TOKEN')
  assert.equal(parsed.value, 'a%3Db')
  assert.equal(parsed.options.path, '/')
  assert.equal(parsed.options.httpOnly, true)
  assert.equal(parsed.options.sameSite, 'lax')
  assert.equal(parsed.options.maxAge, 7200)
})

test('createHttp injects Origin, Cookie, and X-XSRF-TOKEN on SSR writes', async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return {
      ok: true,
      status: url.includes('csrf-cookie') ? 204 : 200,
      headers: { get() { return null }, getSetCookie() { return [] } },
      text: async () => (url.includes('csrf-cookie') ? '' : '{"ok":true}'),
    }
  }

  const http = createHttp({
    baseUrl: 'http://laravel.test',
    origin: 'http://localhost:3000',
    cookies: () => 'XSRF-TOKEN=plain-token; laravel_session=sess',
    fetchImpl,
  })

  const result = await http.request('/api/v1/auth/login', { method: 'POST', body: { email: 'a@b.c' } })
  assert.equal(result.ok, true)
  assert.equal(calls.length, 2)
  assert.ok(String(calls[0].url).endsWith('/sanctum/csrf-cookie'))
  const write = calls[1]
  assert.equal(write.init.headers.Origin, 'http://localhost:3000')
  assert.equal(write.init.headers.Referer, 'http://localhost:3000/')
  assert.equal(write.init.headers.Cookie, 'XSRF-TOKEN=plain-token; laravel_session=sess')
  assert.equal(write.init.headers['X-XSRF-TOKEN'], 'plain-token')
})

test('createHttp returns http error when fetch throws', async () => {
  const http = createHttp({
    baseUrl: 'http://laravel.test',
    fetchImpl: async () => {
      throw new Error('ECONNREFUSED')
    },
  })

  const result = await http.request('/api/v1/auth/me', { method: 'GET' })
  assert.equal(result.ok, false)
  assert.equal(result.error.kind, 'http')
})

test('createHttp retries once after 419', async () => {
  let writes = 0
  const fetchImpl = async (url) => {
    if (String(url).includes('csrf-cookie')) {
      return {
        ok: true,
        status: 204,
        headers: { get() { return null }, getSetCookie() { return [] } },
        text: async () => '',
      }
    }
    writes += 1
    const status = writes === 1 ? 419 : 200
    return {
      ok: status === 200,
      status,
      headers: { get() { return null }, getSetCookie() { return [] } },
      text: async () => (status === 200 ? '{"ok":true}' : '{"message":"CSRF"}'),
    }
  }

  const http = createHttp({
    baseUrl: 'http://laravel.test',
    origin: 'http://localhost:3000',
    cookies: () => 'XSRF-TOKEN=t',
    fetchImpl,
  })

  const result = await http.request('/api/v1/auth/logout', { method: 'POST' })
  assert.equal(result.ok, true)
  assert.equal(writes, 2)
})
