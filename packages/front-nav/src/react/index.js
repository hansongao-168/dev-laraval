import { useCallback, useEffect, useRef, useState, use } from 'react';
import { fetchNav, createNavCache, resolveLabels } from '../core/index.js';

/**
 * React 19 hook for fetching nav + i18n resolution.
 *
 * Design choices:
 *  - One cache per hook instance; the default cache has 60s TTL. Hosts
 *    with their own NavCache (e.g. sharing with other components) can
 *    inject one via options.cache.
 *  - We expose `refresh()` so listeners on `NavStructureChanged` can
 *    invalidate + re-fetch.
 *  - React 19 `use()` is intentionally NOT used because the inputs are
 *    synchronous (Translator, locations array). Plain useEffect suffices
 *    and works under React 18 too.
 */
export function useFrontNav(options) {
  const {
    http,
    locations,
    locale = null,
    translate,
    cache: cacheFromOptions,
    skip = false,
    refetchIntervalMs = 0,
  } = options;

  const locationsArr = Array.isArray(locations) ? locations : [locations];
  const cacheRef = useRef(cacheFromOptions);
  if (!cacheRef.current) {
    cacheRef.current = createNavCache();
  }

  const [state, setState] = useState(() => ({
    items: /** @type {Record<NavLocation, NavItem[]>} */ (
      Object.fromEntries(locationsArr.map((l) => [l, []]))
    ),
    loading: !skip,
    error: /** @type {Error | null} */ (null),
  }));

  const fetchAll = useCallback(async () => {
    if (skip) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const out = {};
      for (const loc of locationsArr) {
        const cached = cacheRef.current.get(loc, locale);
        if (cached) {
          out[loc] = translate ? resolveLabels(cached.data, translate) : cached.data;
          continue;
        }
        const fresh = await fetchNav(http, { location: loc, locale });
        cacheRef.current.set(loc, locale, fresh);
        out[loc] = translate ? resolveLabels(fresh.data, translate) : fresh.data;
      }
      setState({ items: out, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e : new Error(String(e)) }));
    }
  }, [http, locationsArr.join(','), locale, translate, skip]);

  useEffect(() => {
    fetchAll();
    if (!refetchIntervalMs) {
      return undefined;
    }
    const id = setInterval(fetchAll, refetchIntervalMs);
    return () => clearInterval(id);
  }, [fetchAll, refetchIntervalMs]);

  const refresh = useCallback(async () => {
    for (const loc of locationsArr) {
      cacheRef.current.invalidate(loc);
    }
    await fetchAll();
  }, [locationsArr, fetchAll]);

  return {
    items: state.items,
    loading: state.loading,
    error: state.error,
    refresh,
  };
}

// Re-export `use` so consumers using React 19's suspense pattern can wire
// their own translators without needing a second import.
export { use };
