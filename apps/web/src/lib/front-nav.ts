/**
 * apps/web — server-side wrapper around `@erp/front-nav`.
 *
 * Pattern:
 *   1. Read the session cookie via next/headers.
 *   2. Build an `HttpClient` that includes the session cookie on the
 *      outbound request so the Laravel endpoint sees the same auth
 *      context as the rest of the page.
 *   3. Call `fetchNav` from the SDK and return the resolved tree.
 *
 * Why server-side only: nav is fetched at request time, included in the
 * initial HTML, and cached by Next's data cache. Client-side fetches
 * after hydration would add a round-trip with no benefit unless the
 * visitor's permissions change mid-session — handle that case via the
 * client `useFrontNav` hook.
 *
 * NOTE: this is intentionally a thin wrapper. Do NOT add caching, retry,
 * or auth logic here — the SDK and `@erp/api-client` already own those.
 */
import { cookies } from 'next/headers';
import { createHttp } from '@erp/api-client/core';
import { fetchNav, resolveLabels } from '@erp/front-nav/core';
import type { NavItem, NavLocation } from '@erp/front-nav/core';

const FRONT_NAV_LOCATIONS = ['header', 'sidebar', 'footer', 'mobile'] as const;
type FrontNavLocation = (typeof FRONT_NAV_LOCATIONS)[number];

function isLocation(value: string): value is FrontNavLocation {
  return (FRONT_NAV_LOCATIONS as readonly string[]).includes(value);
}

/**
 * Server-side fetch of one location's nav tree.
 *
 * Returns the items already translated (the server sidecar `i18n` is a
 * no-op when callers don't supply one — the resolver runs identically
 * either way and the renderer can still override labels via the SDK).
 *
 * @param location  One of the documented NavLocation values.
 * @param locale    Optional BCP-47 locale tag for i18n filtering.
 */
export async function getFrontNav(location: string, locale?: string): Promise<NavItem[]> {
  if (! isLocation(location)) {
    return [];
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    'http://localhost:8000';

  const http = createHttp({
    baseUrl,
    cookies: () => cookieHeader,
  });

  const response = await fetchNav(http, {
    location: location as NavLocation,
    locale: locale ?? null,
  });

  // No translator on the server — labels fall back to the backend
  // "source-language" string. The client hook (useFrontNav) overrides
  // them with the user's locale catalog.
  return resolveLabels(response.data, (key) => key);
}
