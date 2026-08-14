/**
 * Default in-memory cache. Entries expire after `ttlMs` (default 60_000ms).
 *
 * Kept trivial so tests can poke at it directly. Hosts that need richer
 * behaviour (SWR, IndexedDB, …) can implement NavCache themselves.
 */
export function createNavCache({ ttlMs = 60_000, now = Date.now } = {}) {
  /** @type {Map<string, { value: NavResponse, expiresAt: number }>} */
  const store = new Map();

  function prune() {
    const t = now();
    for (const [k, v] of store) {
      if (v.expiresAt <= t) {
        store.delete(k);
      }
    }
  }

  return {
    get(location, locale) {
      prune();
      const entry = store.get(cacheKey(location, locale));
      return entry ? entry.value : undefined;
    },
    set(location, locale, value) {
      store.set(cacheKey(location, locale), { value, expiresAt: now() + ttlMs });
    },
    invalidate(location) {
      if (!location) {
        store.clear();
        return;
      }
      const prefix = `front-nav:${location}:`;
      for (const k of store.keys()) {
        if (k.startsWith(prefix)) {
          store.delete(k);
        }
      }
    },
  };
}

export function cacheKey(location, locale) {
  return `front-nav:${location}:${locale ?? 'any'}`;
}
