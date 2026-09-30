import { normalizeSeoLocale, resolvePageShareImage } from '@erp/front-experience/core';
import type { ResolvedPage } from '@erp/front-experience/core';

/** Origin for absolute brand asset URLs in share cards. */
export const API_ORIGIN = (
  process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000'
).replace(/\/api\/v1\/?$/, '');

export function clientLocale(): string {
  try {
    const language =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().locale
        : null;
    return normalizeSeoLocale(language);
  } catch {
    return 'zh_CN';
  }
}

export function shareImageForPage(
  page: ResolvedPage | null | undefined,
  locale?: string,
): string | undefined {
  if (!page) {
    return undefined;
  }

  return resolvePageShareImage(page, locale ?? clientLocale(), API_ORIGIN);
}
