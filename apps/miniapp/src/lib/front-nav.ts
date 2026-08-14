/**
 * apps/miniapp — Taro 4 (WeChat Mini Program) integration for @erp/front-nav.
 *
 * Taro mini programs have NO `fetch`, NO `window`, NO DOM — they use
 * `Taro.request`. The @erp/front-nav core is FetchLike-agnostic (verified
 * by `core.env.test.mjs`), so we build the HTTP adapter ourselves with
 * `Taro.request` and hand it to `fetchNav`. This proves the SDK core
 * works in every environment that can provide a `request` function.
 */
import Taro from '@tarojs/taro'
import { createNavCache, fetchNav, resolveLabels } from '@erp/front-nav/core'
import type { NavItem, NavLocation } from '@erp/front-nav/core'

const API_URL = process.env.TARO_APP_API_URL ?? 'http://localhost/api/v1'

/** Adapter: turn @erp/front-nav's FetchLike calls into Taro.request. */
const http = {
  async request<T = unknown>(
    path: string,
    options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; headers?: Record<string, string> } = {},
  ): Promise<{ ok: boolean; status: number; data: T }> {
    const response = await Taro.request({
      url: path.startsWith('http') ? path : `${API_URL}/${String(path).replace(/^\/+/, '')}`,
      method: (options.method ?? 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'TRACE' | 'PATCH',
      header: options.headers,
    })

    return {
      ok: response.statusCode >= 200 && response.statusCode < 300,
      status: response.statusCode,
      data: response.data as T,
    }
  },
}

const cache = createNavCache({ ttlMs: 5 * 60_000 })

/**
 * Fetch a nav tree for the given location with client-side i18n.
 *
 * @example
 * ```tsx
 * const [items, setItems] = useState<NavItem[]>([])
 * useLoad(() => {
 *   getFrontNav('mobile', (k) => k)  // or a mini-program i18n util
 *     .then(setItems)
 *     .catch(() => setItems([]))
 * })
 * ```
 */
export async function getFrontNav(
  location: NavLocation,
  translate?: (key: string) => string,
): Promise<NavItem[]> {
  const cached = cache.get(location, null)
  if (cached) {
    return translate ? resolveLabels(cached.data, translate) : cached.data
  }

  const response = await fetchNav(http, { location, locale: null })
  cache.set(location, null, response)

  return translate ? resolveLabels(response.data, translate) : response.data
}

export type { NavItem, NavLocation }
