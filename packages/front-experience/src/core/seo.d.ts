export type FrontSeo = {
  title?: string;
  description?: string;
  siteName?: string;
  image?: string;
  images?: Record<string, string>;
  type?: 'website' | 'article' | string;
};

export declare function normalizeSeoLocale(locale?: string | null): string;
export declare function resolveSeoImage(
  seo?: FrontSeo | null,
  locale?: string | null,
): string | undefined;
export declare function readPageSeo(page: unknown): FrontSeo;
export declare function absoluteAssetUrl(pathOrUrl: string, baseUrl: string): string;
export declare function resolvePageShareImage(
  page: unknown,
  locale: string | null | undefined,
  baseUrl: string,
): string | undefined;
