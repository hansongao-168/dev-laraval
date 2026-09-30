import { createHttp } from '@erp/api-client/core';
import { fetchPage } from '@erp/front-experience/core';
import type { ResolvedPage } from '@erp/front-experience/core';

/** Origin only — fetch helpers already prefix `/api/v1/...`. */
const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000'
).replace(/\/api\/v1\/?$/, '');

const http = createHttp({ baseUrl: API_URL });

export async function getFrontPage(options: {
  slug: string;
  channel?: string;
  at?: string;
  theme?: string;
  skin?: string;
  id?: string | number;
  q?: string;
  page?: string | number;
  query?: Record<string, string | number | undefined | null>;
}): Promise<ResolvedPage> {
  return fetchPage(http, { channel: 'mobile', ...options });
}
