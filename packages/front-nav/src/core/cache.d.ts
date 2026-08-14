import type { NavResponse } from './types.js';

/**
 * A simple in-memory cache with TTL. Per-process; for cross-process caching
 * rely on the server-side cache instead (controlled by `front-nav.cache.ttl`).
 *
 * Default cache key is the canonical "front-nav:{location}:{locale}".
 * Visitor identity is intentionally NOT part of the key here — that's the
 * server's responsibility. We cache the raw wire payload so that any
 * post-processing (i18n, visibility filtering on the client) doesn't
 * leak across users via shared cache entries.
 */
export interface NavCacheOptions {
  ttlMs?: number;
  /** Injectable clock for tests. */
  now?: () => number;
}

export interface NavCache {
  get(location: string, locale: string | null): NavResponse | undefined;
  set(location: string, locale: string | null, value: NavResponse): void;
  invalidate(location?: string): void;
}

export declare function createNavCache(options?: NavCacheOptions): NavCache;

export declare function cacheKey(location: string, locale: string | null): string;
