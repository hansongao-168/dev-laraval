import { cookies, headers } from 'next/headers'
import { createHttp, parseSetCookieList, type HttpClient } from '@erp/api-client/core'

/**
 * Laravel origin (no /api/v1 suffix). Domain clients already prefix /api/v1/*.
 */
export function laravelOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL

  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '').replace(/\/api\/v1$/i, '')
  }

  return 'http://localhost:8000'
}

export function webOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_ORIGIN ??
    process.env.FRONTEND_URL ??
    'http://localhost:3000'
  )
}

function applySetCookies(
  store: Awaited<ReturnType<typeof cookies>>,
  jar: Record<string, string>,
  setCookieHeaders: string[],
): void {
  for (const parsed of parseSetCookieList(setCookieHeaders)) {
    jar[parsed.name] = parsed.value
    try {
      store.set(parsed.name, parsed.value, {
        path: typeof parsed.options.path === 'string' ? parsed.options.path : '/',
        httpOnly: parsed.options.httpOnly,
        secure: parsed.options.secure,
        sameSite: parsed.options.sameSite,
        maxAge: parsed.options.maxAge,
      })
    } catch {
      // Server Components cannot mutate cookies; Server Actions can.
    }
  }
}

export async function ssrHttp(): Promise<HttpClient> {
  const store = await cookies()
  const jar: Record<string, string> = {}
  for (const pair of store.getAll()) {
    jar[pair.name] = pair.value
  }

  let origin = webOrigin()
  try {
    const requestHeaders = await headers()
    const fromRequest = requestHeaders.get('origin') || requestHeaders.get('referer')
    if (fromRequest) {
      origin = new URL(fromRequest).origin
    }
  } catch {
    // headers() unavailable outside a request
  }

  return createHttp({
    baseUrl: laravelOrigin(),
    origin,
    cookies: () => {
      const entries = Object.entries(jar)
      if (entries.length === 0) {
        return undefined
      }
      return entries.map(([name, value]) => `${name}=${value}`).join('; ')
    },
    onSetCookie: (setCookieHeaders: string[]) => applySetCookies(store, jar, setCookieHeaders),
  })
}
