/**
 * CSRF 协调器。
 */
export interface EnsureCsrfOptions {
  fetchImpl?: typeof fetch;
  origin?: string;
  cookies?: () => string | undefined;
  onSetCookie?: (setCookieHeaders: string[]) => void;
}

export declare function ensureCsrfCookie(baseUrl: string, extras?: EnsureCsrfOptions): Promise<void>;

export declare function csrfHeaders(): Record<string, string>;
