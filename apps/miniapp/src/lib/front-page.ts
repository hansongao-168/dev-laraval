import Taro from '@tarojs/taro'
import { fetchFrontPageDocument, mainBlocks, type FrontPageDocument } from '@erp/front-experience'

function apiOrigin(): string {
  return (process.env.TARO_APP_API_URL ?? 'http://localhost')
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/i, '')
}

const origin = apiOrigin()

const http = {
  async request<T = unknown>(
    path: string,
    options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' } = {},
  ): Promise<{ ok: boolean; status: number; data: T }> {
    const response = await Taro.request({
      url: path.startsWith('http') ? path : `${origin}/${String(path).replace(/^\/+/, '')}`,
      method: (options.method ?? 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'TRACE' | 'PATCH',
    })

    return {
      ok: response.statusCode >= 200 && response.statusCode < 300,
      status: response.statusCode,
      data: response.data as T,
    }
  },
}

export async function getFrontPageSafe(
  slug: string,
  channel = 'mp',
): Promise<FrontPageDocument | null> {
  return fetchFrontPageDocument(http, slug, channel)
}

export { mainBlocks }
export type { FrontPageDocument }
