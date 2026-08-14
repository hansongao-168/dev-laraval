import type { NavResponse, NavLocation } from './types.js';

/**
 * Minimal HTTP contract this SDK relies on.
 *
 * Designed to be implemented by `@erp/api-client`'s HttpClient, so we
 * don't import that package directly (keeps the dependency graph clean
 * and lets apps use any compatible client).
 */
export interface FetchLike {
  request<T = unknown>(
    path: string,
    options?: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      headers?: Record<string, string>;
      body?: unknown;
      signal?: AbortSignal;
    },
  ): Promise<{ ok: boolean; status: number; data: T }>;
}

export interface FetchNavOptions {
  location: NavLocation;
  /** BCP-47 locale tag such as "zh-CN". Optional — legacy callers may omit. */
  locale?: string | null;
  /** Optional AbortSignal to cancel the request (e.g. on route change). */
  signal?: AbortSignal;
}

/**
 * Fetch a single location's nav tree from the backend.
 *
 * Throws `FrontNavError` when the response is not ok or the payload is
 * malformed. Callers are expected to catch and fall back to local defaults.
 */
export declare function fetchNav(
  http: FetchLike,
  options: FetchNavOptions,
): Promise<NavResponse>;

export declare class FrontNavError extends Error {
  constructor(message: string, public readonly status?: number, public readonly cause?: unknown);
}
