/**
 * 共享类型。
 */
export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
  headers?: Headers;
}

export type ApiErrorKind =
  | 'http'
  | 'unauthenticated'
  | 'csrf_expired'
  | 'validation'
  | 'rate_limited'
  | 'server';

export interface ApiError {
  kind: ApiErrorKind;
  status?: number;
  message?: string;
  /** validation errors: { field: string[] } */
  fieldErrors?: Record<string, string[]>;
  /** rate_limited 时的重试秒数 */
  retryAfter?: number;
}