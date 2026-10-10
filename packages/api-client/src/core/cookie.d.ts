/**
 * 浏览器端 / SSR Cookie 读取工具（Sanctum SPA 模式）。
 */
export declare function readCookie(name: string): string | null;

export declare function readCookieFromHeader(cookieHeader: string | undefined, name: string): string | null;

export declare function csrfHeadersFromCookieHeader(cookieHeader: string | undefined): Record<string, string>;

export interface ParsedSetCookie {
  name: string;
  value: string;
  options: {
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    maxAge?: number;
  };
}

export declare function parseSetCookie(line: string): ParsedSetCookie | null;

export declare function parseSetCookieList(headers: string | string[] | undefined): ParsedSetCookie[];
