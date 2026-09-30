import { cookies } from 'next/headers';
import { createHttp } from '@erp/api-client/core';
import {
  fetchActiveTheme,
  fetchBlockTypes,
  fetchCapabilities,
  fetchPage,
  fetchShells,
  fetchSkin,
} from '@erp/front-experience/core';
import type {
  ResolvedPage,
  ThemeInfo,
  BlockTypeInfo,
  CapabilityInfo,
} from '@erp/front-experience/core';

async function serverHttp() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
    .join('; ');

  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    'http://localhost:8000';

  return createHttp({
    baseUrl,
    cookies: () => cookieHeader,
  });
}

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
  const http = await serverHttp();
  return fetchPage(http, { channel: 'web', ...options });
}

export async function getFrontSkin(code: string) {
  const http = await serverHttp();
  return fetchSkin(http, code);
}

export async function getActiveTheme(at?: string): Promise<ThemeInfo | null> {
  const http = await serverHttp();
  return fetchActiveTheme(http, { at, channel: 'web' });
}

export async function getBlockTypes(): Promise<BlockTypeInfo[]> {
  const http = await serverHttp();
  return fetchBlockTypes(http, { channel: 'web' });
}

export async function getShells() {
  const http = await serverHttp();
  return fetchShells(http);
}

export async function getCapabilities(): Promise<CapabilityInfo[]> {
  const http = await serverHttp();
  return fetchCapabilities(http);
}

export function isFrontStudioEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_FRONT_STUDIO === '1') {
    return true;
  }

  return process.env.NODE_ENV !== 'production';
}
