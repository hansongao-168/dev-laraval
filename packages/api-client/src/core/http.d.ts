import type { ApiResponse, ApiError } from './types.js';

export declare function normalizeBaseUrl(baseUrl: string): string;

export interface HttpOptions {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  /** SSR 场景下：返回 Cookie header 字符串；由 Next cookies() 提供 */
  cookies?: () => string | undefined;
  /** 测试场景下：注入 fetch */
  fetchImpl?: typeof fetch;
  /** 显式 XSRF；未提供时从 cookies() 或 document.cookie 读 */
  getXsrfToken?: () => string | undefined;
  /** apps/web origin，写入 Origin/Referer 以便 Sanctum stateful 识别 */
  origin?: string;
  /** SSR：把 Laravel Set-Cookie 回写到 Next cookie jar */
  onSetCookie?: (setCookieHeaders: string[]) => void;
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