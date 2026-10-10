import { csrfHeadersFromCookieHeader, readCookieFromHeader } from './cookie.js'

/**
 * CSRF coordinator — GET /sanctum/csrf-cookie then send X-XSRF-TOKEN.
 *
 * Browser: credentials include; token lands in document.cookie.
 * SSR: pass fetchImpl + origin + onSetCookie to persist Set-Cookie on the Next jar.
 */

let csrfPromise = null

export function csrfHeaders() {
  if (typeof document === 'undefined') return {}
  return csrfHeadersFromCookieHeader(document.cookie)
}

export function ensureCsrfCookie(baseUrl, extras = {}) {
  const {
    fetchImpl,
    origin,
    cookies,
    onSetCookie,
  } = extras
  const _fetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null)

  if (!_fetch) {
    return Promise.resolve()
  }

  if (typeof window === 'undefined' && !onSetCookie && !cookies) {
    return Promise.resolve()
  }

  if (csrfPromise) return csrfPromise

  const headers = { Accept: 'application/json' }
  if (origin) {
    headers.Origin = origin
    headers.Referer = origin.endsWith('/') ? origin : `${origin}/`
  }
  if (typeof cookies === 'function') {
    const cookieHeader = cookies()
    if (cookieHeader) {
      headers.Cookie = cookieHeader
    }
  }

  csrfPromise = _fetch(String(baseUrl || '').replace(/\/+$/, '') + '/sanctum/csrf-cookie', {
    method: 'GET',
    credentials: typeof window !== 'undefined' ? 'include' : 'omit',
    headers,
  })
    .then((res) => {
      if (typeof onSetCookie === 'function' && res && res.headers) {
        const listed = typeof res.headers.getSetCookie === 'function'
          ? res.headers.getSetCookie()
          : []
        const fallback = res.headers.get && res.headers.get('set-cookie')
        onSetCookie(listed.length ? listed : (fallback ? [fallback] : []))
      }
      return res
    })
    .catch(() => null)
    .finally(() => {
      setTimeout(() => { csrfPromise = null }, 0)
    })

  return csrfPromise
}

export { readCookieFromHeader, csrfHeadersFromCookieHeader }
