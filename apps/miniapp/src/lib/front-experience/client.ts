import Taro from '@tarojs/taro'
import { fetchPage } from '@erp/front-experience/core'
import type { ResolvedPage } from '@erp/front-experience/core'

/** Origin only — fetch helpers already prefix `/api/v1/...`. */
const API_URL = (process.env.TARO_APP_API_URL ?? 'http://localhost').replace(
  /\/api\/v1\/?$/,
  '',
)

const http = {
  async request<T = unknown>(
    path: string,
    options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; headers?: Record<string, string> } = {},
  ): Promise<{ ok: boolean; status: number; data: T }> {
    const response = await Taro.request({
      url: path.startsWith('http') ? path : `${API_URL.replace(/\/$/, '')}/${String(path).replace(/^\/+/, '')}`,
      method: (options.method ?? 'GET') as 'GET',
      header: options.headers,
    })

    return {
      ok: response.statusCode >= 200 && response.statusCode < 300,
      status: response.statusCode,
      data: response.data as T,
    }
  },
}

export async function getFrontPage(options: {
  slug: string
  channel?: string
  at?: string
  theme?: string
  skin?: string
  id?: string | number
  q?: string
  page?: string | number
  query?: Record<string, string | number | undefined | null>
}): Promise<ResolvedPage> {
  return fetchPage(http, { channel: 'miniapp', ...options })
}
