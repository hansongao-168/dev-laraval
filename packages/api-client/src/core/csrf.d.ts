/**
 * CSRF 协调器。
 */
export declare function ensureCsrfCookie(baseUrl: string): Promise<void>;

export declare function csrfHeaders(): Record<string, string>;