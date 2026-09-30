import type { Metadata } from 'next';
import type { ResolvedPage } from '@erp/front-experience/core';
import { normalizeSeoLocale, resolveSeoImage } from './seo-image.mjs';

export type FrontSeo = {
  title?: string;
  description?: string;
  siteName?: string;
  image?: string;
  /** Locale-keyed share images, e.g. { zh_CN: '...', en: '...' }. */
  images?: Record<string, string>;
  type?: 'website' | 'article';
};

export { normalizeSeoLocale, resolveSeoImage };

function readSeo(page: ResolvedPage): FrontSeo {
  const meta = page.document.meta;
  if (!meta || typeof meta !== 'object') {
    return {};
  }

  const seo = (meta as { seo?: FrontSeo }).seo;
  return seo && typeof seo === 'object' ? seo : {};
}

function siteOrigin(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_WEB_URL ??
    'http://localhost:3000';

  try {
    return new URL(raw);
  } catch {
    return new URL('http://localhost:3000');
  }
}

function absoluteUrl(pathOrUrl: string, base: URL): string {
  try {
    return new URL(pathOrUrl, base).toString();
  } catch {
    return base.toString();
  }
}

function truncate(text: string, max = 160): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, max - 1)}…`;
}

export function articleDetailFromPage(page: ResolvedPage): {
  title?: string;
  description?: string;
} {
  const main = page.document.shell.slots.main ?? [];
  const detail = main.find((block) => block.type === 'mall.article-detail');
  const article = detail?.props?.article;

  if (!article || typeof article !== 'object') {
    return {};
  }

  const row = article as { title?: unknown; content?: unknown; excerpt?: unknown };
  const title = typeof row.title === 'string' && row.title !== '' ? row.title : undefined;
  const body =
    (typeof row.excerpt === 'string' && row.excerpt) ||
    (typeof row.content === 'string' && row.content) ||
    '';

  return {
    title,
    description: body ? truncate(body) : undefined,
  };
}

export function buildStorefrontMetadata(options: {
  page: ResolvedPage;
  fallbackTitle: string;
  path: string;
  preferArticle?: boolean;
  locale?: string | null;
}): Metadata {
  const base = siteOrigin();
  const seo = readSeo(options.page);
  const locale = normalizeSeoLocale(options.locale);
  const article = options.preferArticle ? articleDetailFromPage(options.page) : {};

  const title =
    article.title ||
    seo.title ||
    options.page.document.page.title?.zh_CN ||
    options.page.document.page.title?.en ||
    options.fallbackTitle;

  const description = article.description || seo.description || undefined;
  const siteName = seo.siteName || 'ERP Global';
  const type = seo.type || (options.preferArticle ? 'article' : 'website');
  const url = absoluteUrl(options.path, base);
  const imagePath = resolveSeoImage(seo, locale);
  const image = imagePath ? absoluteUrl(imagePath, base) : undefined;

  return {
    metadataBase: base,
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName,
      type,
      locale,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
