import {
  fetchFrontPageDocument,
  type FrontPageBlock,
  type FrontPageDocument,
} from '@erp/front-experience'
import { ssrHttp } from '@/lib/ssr-http'

export type { FrontPageBlock, FrontPageDocument }

export async function getFrontPageSafe(slug: string, channel = 'web'): Promise<FrontPageDocument | null> {
  const http = await ssrHttp()

  return fetchFrontPageDocument(http, slug, channel)
}
