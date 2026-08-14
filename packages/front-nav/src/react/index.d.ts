import type { NavItem, NavLocation, Translator } from '../core/index.js';
import type { FetchLike, NavCache } from '../core/index.js';

/**
 * React 19 hook: fetch one or more locations and resolve labels.
 *
 * The hook owns its own cache (passed in via options.cache). When the
 * cache is shared across the app (recommended), repeated calls within
 * the TTL window skip the network round-trip.
 *
 * @example
 *   const { items, error, refresh } = useFrontNav({
 *     http,
 *     locations: ['sidebar', 'mobile'],
 *     locale: 'zh-CN',
 *     translate: i18n.t,
 *   });
 */
export interface UseFrontNavOptions {
  http: FetchLike;
  locations: NavLocation | NavLocation[];
  locale?: string | null;
  translate?: Translator;
  cache?: NavCache;
  /** Skip the request entirely (used by gated UIs). */
  skip?: boolean;
  /** Refetch interval (ms); 0 disables polling. Defaults to 0. */
  refetchIntervalMs?: number;
}

export interface UseFrontNavResult {
  /** Items, grouped by location in the order requested. */
  items: Record<NavLocation, NavItem[]>;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export declare function useFrontNav(options: UseFrontNavOptions): UseFrontNavResult;
