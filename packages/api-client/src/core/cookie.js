/**
 * Cookie helpers for Sanctum SPA (browser `document.cookie` and SSR Cookie headers).
 *
 * Laravel Set-Cookie XSRF-TOKEN is URL-encoded; decode when reading.
 */

export function readCookie(name) {
  if (typeof document === 'undefined') return null
  return readCookieFromHeader(document.cookie, name)
}

export function readCookieFromHeader(cookieHeader, name) {
  if (!cookieHeader || !name) return null
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp('(?:^|; )' + escaped + '=([^;]*)').exec(cookieHeader)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch (_err) {
    return match[1]
  }
}

export function csrfHeadersFromCookieHeader(cookieHeader) {
  const token = readCookieFromHeader(cookieHeader, 'XSRF-TOKEN')
  if (!token) return {}
  return { 'X-XSRF-TOKEN': token }
}

/**
 * Parse one Set-Cookie line into { name, value, options } for Next cookies().set.
 *
 * @param {string} line
 */
export function parseSetCookie(line) {
  if (!line || typeof line !== 'string') return null
  const segments = line.split(';').map((part) => part.trim()).filter(Boolean)
  const first = segments.shift()
  if (!first) return null
  const eq = first.indexOf('=')
  if (eq <= 0) return null
  const name = first.slice(0, eq).trim()
  const value = first.slice(eq + 1).trim()
  /** @type {Record<string, unknown>} */
  const options = { path: '/' }

  for (const segment of segments) {
    const [rawKey, ...rest] = segment.split('=')
    const key = rawKey.trim().toLowerCase()
    const attrValue = rest.join('=').trim()

    if (key === 'httponly') {
      options.httpOnly = true
    } else if (key === 'secure') {
      options.secure = true
    } else if (key === 'samesite') {
      const sameSite = attrValue.toLowerCase()
      if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') {
        options.sameSite = sameSite
      }
    } else if (key === 'path' && attrValue) {
      options.path = attrValue
    } else if (key === 'max-age' && attrValue) {
      const maxAge = Number(attrValue)
      if (!Number.isNaN(maxAge)) {
        options.maxAge = maxAge
      }
    }
  }

  return { name, value, options }
}

export function parseSetCookieList(headers) {
  if (!headers) return []
  const lines = Array.isArray(headers) ? headers : [headers]
  return lines.map(parseSetCookie).filter(Boolean)
}
