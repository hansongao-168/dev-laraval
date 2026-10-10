import type { FrontPageBlock, FrontPageDocument } from './types'

export interface FrontPageHttp {
  request<T = unknown>(
    path: string,
    options?: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' },
  ): Promise<{ ok: boolean; status: number; data: T }>
}

export async function fetchFrontPageDocument(
  http: FrontPageHttp,
  slug: string,
  channel = 'web',
): Promise<FrontPageDocument | null> {
  try {
    const result = await http.request<{ data?: { document?: FrontPageDocument } }>(
      `/api/v1/front-pages/${encodeURIComponent(slug)}?channel=${encodeURIComponent(channel)}`,
      { method: 'GET' },
    )

    if (!result.ok) {
      return null
    }

    return result.data?.data?.document ?? null
  } catch {
    return null
  }
}

export function mainBlocks(document: FrontPageDocument | null): FrontPageBlock[] {
  return document?.shell?.slots?.main ?? []
}
