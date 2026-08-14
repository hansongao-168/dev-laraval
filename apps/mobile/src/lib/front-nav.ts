/**
 * apps/mobile — Expo (React Native) integration example for @erp/front-nav.
 *
 * The SDK core is framework-agnostic (verified by `core.env.test.mjs`):
 * it works in RN with zero DOM / window / localStorage / global fetch.
 * This file shows the idiomatic RN usage:
 *
 *   1. Create the HTTP client with `@erp/api-client`'s createHttp.
 *   2. Call `fetchNav(http, { location, locale })`.
 *   3. Resolve labels via a translator (e.g. react-i18next).
 *   4. Cache with `createNavCache`.
 *
 * No platform-specific API is used — this compiles and runs on
 * iOS / Android / Expo Go.
 */
import { createHttp } from '@erp/api-client/core';
import { createNavCache, fetchNav, resolveLabels } from '@erp/front-nav/core';
import type { NavItem, NavLocation, NavResponse } from '@erp/front-nav/core';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api/v1';

/** Reuse a single cache across screens. */
const cache = createNavCache({ ttlMs: 5 * 60_000 });

const http = createHttp({ baseUrl: API_URL });

/**
 * Fetch a nav tree for the given location, applying client-side i18n.
 *
 * @param location  'header' | 'sidebar' | 'footer' | 'mobile'
 * @param translate Optional `(key: string) => string` translator.
 *                  When omitted, the server-side `label` is used as-is.
 */
export async function getFrontNav(
  location: NavLocation,
  translate?: (key: string) => string,
): Promise<NavItem[]> {
  const cached = cache.get(location, null);
  if (cached) {
    return translate ? resolveLabels(cached.data, translate) : cached.data;
  }

  const response: NavResponse = await fetchNav(http, {
    location,
    locale: null,
  });
  cache.set(location, null, response);

  return translate ? resolveLabels(response.data, translate) : response.data;
}

/**
 * Example usage from a React Native component:
 *
 * ```tsx
 * const [items, setItems] = useState<NavItem[]>([]);
 *
 * useEffect(() => {
 *   getFrontNav('mobile', (k) => i18next.t(k))
 *     .then(setItems)
 *     .catch(() => setItems([]));
 * }, []);
 * ```
 */
export type { NavItem, NavLocation };
