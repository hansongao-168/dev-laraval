import type { ApiResponse, ApiError } from './types.js';

export declare function normalizeBaseUrl(baseUrl: string): string;

export interface HttpOptions {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  /** SSR 场景下：返回 Cookie header 字符串；由 Next cookies() 提供 */
  cookies?: () => string | undefined;
  /** 测试场景下：注入 fetch */
  fetchImpl?: typeof fetch;
  /** 浏览器场景下：返回 X-XSRF-TOKEN；默认从 document.cookie 读 */
  getXsrfToken?: () => string | undefined;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  isForm?: boolean;
}

export interface HttpClient {
  request<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T> & { error?: ApiError }>;
  url(path: string): string;
  rawFetch(path: string, options?: RequestOptions): Promise<ApiResponse<unknown>>;
}

export declare function createHttp(options: HttpOptions): HttpClient;