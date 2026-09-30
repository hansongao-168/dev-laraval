/**
 * @typedef {{ image?: string; images?: Record<string, string>; title?: string; description?: string; siteName?: string; type?: string }} FrontSeo
 */

/**
 * Normalize BCP-47 / underscore locale tags for SEO image maps.
 *
 * @param {string | null | undefined} locale
 * @returns {string}
 */
export function normalizeSeoLocale(locale) {
  if (!locale || typeof locale !== 'string') {
    return 'zh_CN';
  }

  const trimmed = locale.trim().replace(/-/g, '_');
  if (trimmed === '') {
    return 'zh_CN';
  }

  const parts = trimmed.split('_').filter(Boolean);
  if (parts.length === 0) {
    return 'zh_CN';
  }

  const language = parts[0].toLowerCase();
  if (parts.length === 1) {
    if (language === 'zh') {
      return 'zh_CN';
    }
    return language;
  }

  const region = parts[1].toUpperCase();
  if (language === 'zh') {
    return `zh_${region === 'TW' || region === 'HK' ? region : 'CN'}`;
  }

  return `${language}_${region}`;
}

/**
 * Pick a share image for the active locale.
 * Prefers images[locale], then images[language], then image fallback.
 *
 * @param {FrontSeo | null | undefined} seo
 * @param {string | null | undefined} locale
 * @returns {string | undefined}
 */
export function resolveSeoImage(seo, locale) {
  if (!seo || typeof seo !== 'object') {
    return undefined;
  }

  const normalized = normalizeSeoLocale(locale);
  const images =
    seo.images && typeof seo.images === 'object' && !Array.isArray(seo.images)
      ? seo.images
      : null;

  if (images) {
    const direct = images[normalized];
    if (typeof direct === 'string' && direct.trim() !== '') {
      return direct.trim();
    }

    const language = normalized.split('_')[0];
    const languageHit = images[language];
    if (typeof languageHit === 'string' && languageHit.trim() !== '') {
      return languageHit.trim();
    }

    for (const [key, value] of Object.entries(images)) {
      if (
        typeof value === 'string' &&
        value.trim() !== '' &&
        key.split('_')[0].toLowerCase() === language
      ) {
        return value.trim();
      }
    }
  }

  if (typeof seo.image === 'string' && seo.image.trim() !== '') {
    return seo.image.trim();
  }

  return undefined;
}

/**
 * @param {unknown} page
 * @returns {FrontSeo}
 */
export function readPageSeo(page) {
  const meta = page?.document?.meta;
  if (!meta || typeof meta !== 'object') {
    return {};
  }

  const seo = meta.seo;
  return seo && typeof seo === 'object' && !Array.isArray(seo) ? seo : {};
}

/**
 * @param {string} pathOrUrl
 * @param {string} baseUrl
 * @returns {string}
 */
export function absoluteAssetUrl(pathOrUrl, baseUrl) {
  try {
    return new URL(pathOrUrl, baseUrl).toString();
  } catch {
    return pathOrUrl;
  }
}

/**
 * @param {unknown} page
 * @param {string | null | undefined} locale
 * @param {string} baseUrl  site/API origin for relative brand assets
 * @returns {string | undefined}
 */
export function resolvePageShareImage(page, locale, baseUrl) {
  const path = resolveSeoImage(readPageSeo(page), locale);
  if (!path) {
    return undefined;
  }

  return absoluteAssetUrl(path, baseUrl);
}
