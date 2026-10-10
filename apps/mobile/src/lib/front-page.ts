import { createHttp } from '@erp/api-client/core'
import { fetchFrontPageDocument, mainBlocks, type FrontPageDocument } from '@erp/front-experience'

function apiOrigin(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000')
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/i, '')
}

const http = createHttp({ baseUrl: apiOrigin() })

export async function getFrontPageSafe(
  slug: string,
  channel = 'mobile',
): Promise<FrontPageDocument | null> {
  return fetchFrontPageDocument(http, slug, channel)
}

export { mainBlocks }
export type { FrontPageDocument }
