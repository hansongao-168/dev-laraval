import { csrfHeaders, ensureCsrfCookie } from './csrf.js'

/**
 * 统一 HTTP 客户端 — 浏览器 fetch 包装 + 错误归一。
 *
 * 错误归一：
 *   401 → { kind: 'unauthenticated' }
 *   419 → 自动重取 CSRF 后重放一次
 *   422 → { kind: 'validation', fieldErrors: { field: [msg] } }
 *   429 → { kind: 'rate_limited', retryAfter: number }
 *   5xx → { kind: 'server', status }
 *
 * cookie：浏览器场景下自动 include；SSR 场景由调用方传入 cookies。
 */

export function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '')
}

export function createHttp({ baseUrl, defaultHeaders, cookies, fetchImpl, getXsrfToken } = {}) {
  const normalized = normalizeBaseUrl(baseUrl)
  const _fetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null)
  if (!_fetch) {
    throw new Error('createHttp: no fetch implementation available')
  }

  async function rawFetch(path, { method = 'GET', headers = {}, body, signal, isForm = false } = {}) {
    const url = path.startsWith('http') ? path : `${normalized}/${String(path).replace(/^\/+/, '')}`
    const finalHeaders = { Accept: 'application/json', ...(defaultHeaders || {}), ...headers }

    if (!isForm && body !== undefined && !(body instanceof FormData)) {
      finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json'
    }

    // SSR cookie 转发（Next.js Server Component）
    if (cookies && typeof cookies === 'function') {
      const cookieHeader = cookies()
      if (cookieHeader) finalHeaders['Cookie'] = cookieHeader
    }

    // 浏览器 X-XSRF-TOKEN 注入
    if (!isForm) {
      const xsrf = (typeof getXsrfToken === 'function' && getXsrfToken()) || csrfHeaders()
      Object.assign(finalHeaders, xsrf)
    }

    const init = {
      method,
      headers: finalHeaders,
      credentials: typeof window !== 'undefined' ? 'include' : 'omit',
      signal
    }
    if (body !== undefined) {
      init.body = isForm ? body : (typeof body === 'string' ? body : JSON.stringify(body))
    }

    const res = await _fetch(url, init)
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
    // 第一次写请求前确保 CSRF cookie
    const method = (options.method || 'GET').toUpperCase()
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && typeof window !== 'undefined') {
      await ensureCsrfCookie(normalized)
    }

    let result = await rawFetch(path, options)

    // 419: 自动重取 CSRF 重放一次
    if (result.status === 419 && typeof window !== 'undefined') {
      await ensureCsrfCookie(normalized)
      result = await rawFetch(path, options)
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
        fieldErrors: (data && data.errors) || (data && data.fieldErrors) || {}
      }
    }
    if (status === 429) {
      return {
        kind: 'rate_limited',
        retryAfter: Number((data && data.retryAfter) || 60)
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