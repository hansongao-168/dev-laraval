import { csrfHeaders, ensureCsrfCookie } from './csrf.js'
import { csrfHeadersFromCookieHeader } from './cookie.js'

/**
 * Unified HTTP client — fetch wrapper + error normalization.
 *
 * 401 → { kind: 'unauthenticated' }
 * 419 → refresh CSRF and replay once
 * 422 → { kind: 'validation', fieldErrors }
 * 429 → { kind: 'rate_limited', retryAfter }
 * 5xx → { kind: 'server', status }
 */

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

export function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '')
}

export function createHttp({
  baseUrl,
  defaultHeaders,
  cookies,
  fetchImpl,
  getXsrfToken,
  origin,
  onSetCookie,
} = {}) {
  const normalized = normalizeBaseUrl(baseUrl)
  const _fetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null)
  if (!_fetch) {
    throw new Error('createHttp: no fetch implementation available')
  }

  function frontendHeaders() {
    if (!origin) return {}
    const referer = origin.endsWith('/') ? origin : `${origin}/`
    return { Origin: origin, Referer: referer }
  }

  function xsrfHeaders() {
    if (typeof getXsrfToken === 'function') {
      const token = getXsrfToken()
      if (token) return { 'X-XSRF-TOKEN': token }
    }
    if (typeof cookies === 'function') {
      const fromSsr = csrfHeadersFromCookieHeader(cookies() || '')
      if (fromSsr['X-XSRF-TOKEN']) return fromSsr
    }
    return csrfHeaders()
  }

  function captureSetCookie(res) {
    if (typeof onSetCookie !== 'function' || !res || !res.headers) return
    const listed = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : []
    const fallback = res.headers.get && res.headers.get('set-cookie')
    onSetCookie(listed.length ? listed : (fallback ? [fallback] : []))
  }

  async function rawFetch(path, { method = 'GET', headers = {}, body, signal, isForm = false } = {}) {
    const url = path.startsWith('http') ? path : `${normalized}/${String(path).replace(/^\/+/, '')}`
    const finalHeaders = {
      Accept: 'application/json',
      ...frontendHeaders(),
      ...(defaultHeaders || {}),
      ...headers,
    }

    if (!isForm && body !== undefined && !(body instanceof FormData)) {
      finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json'
    }

    if (cookies && typeof cookies === 'function') {
      const cookieHeader = cookies()
      if (cookieHeader) finalHeaders['Cookie'] = cookieHeader
    }

    if (!isForm) {
      Object.assign(finalHeaders, xsrfHeaders())
    }

    const init = {
      method,
      headers: finalHeaders,
      credentials: typeof window !== 'undefined' ? 'include' : 'omit',
      signal,
    }
    if (body !== undefined) {
      init.body = isForm ? body : (typeof body === 'string' ? body : JSON.stringify(body))
    }

    const res = await _fetch(url, init)
    captureSetCookie(res)
    let data = null
    const text = await res.text()
    if (text) {
      try {
        data = JSON.parse(text)
      } catch (_err) {
        data = text
      }
    }
    return { ok: res.ok, status: res.status, data, headers: res.headers }
  }

  async function request(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase()
    const csrfOpts = { fetchImpl: _fetch, origin, cookies, onSetCookie }

    if (WRITE_METHODS.includes(method)) {
      await ensureCsrfCookie(normalized, csrfOpts)
    }

    let result
    try {
      result = await rawFetch(path, options)
    } catch (err) {
      return {
        ok: false,
        status: 0,
        data: null,
        error: { kind: 'http', message: (err && err.message) || 'Network error' },
      }
    }

    if (result.status === 419) {
      await ensureCsrfCookie(normalized, csrfOpts)
      try {
        result = await rawFetch(path, options)
      } catch (err) {
        return {
          ok: false,
          status: 0,
          data: null,
          error: { kind: 'http', message: (err && err.message) || 'Network error' },
        }
      }
    }

    if (result.ok) return { ok: true, status: result.status, data: result.data }

    return { ok: false, status: result.status, data: result.data, error: classifyError(result) }
  }

  function classifyError({ status, data }) {
    if (status === 401) return { kind: 'unauthenticated' }
    if (status === 419) return { kind: 'csrf_expired' }
    if (status === 422) {
      return {
        kind: 'validation',
        fieldErrors: (data && data.errors) || (data && data.fieldErrors) || {},
      }
    }
    if (status === 429) {
      return {
        kind: 'rate_limited',
        retryAfter: Number((data && data.retryAfter) || 60),
      }
    }
    if (status >= 500) {
      return { kind: 'server', status, message: (data && data.message) || 'Server error' }
    }
    return { kind: 'http', status, message: (data && data.message) || 'Request failed' }
  }

  function url(path) {
    return `${normalized}/${String(path).replace(/^\/+/, '')}`
  }

  return { request, url, rawFetch }
}
