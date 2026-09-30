import { normalizeSeoLocale } from './seo-image.mjs';

/**
 * First non-empty locale wins, then default zh_CN.
 *
 * @param {...(string | null | undefined)} candidates
 * @returns {string}
 */
export function pickLocaleCandidate(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return normalizeSeoLocale(candidate);
    }
  }

  return 'zh_CN';
}

/**
 * Parse Accept-Language into the highest-priority tag.
 *
 * @param {string | null | undefined} header
 * @returns {string | null}
 */
export function localeFromAcceptLanguage(header) {
  if (!header || typeof header !== 'string') {
    return null;
  }

  const parts = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      let quality = 1;
      for (const param of params) {
        const match = param.trim().match(/^q=([0-9.]+)$/i);
        if (match) {
          quality = Number(match[1]);
        }
      }
      return { tag: tag?.trim() ?? '', quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((part) => part.tag !== '' && part.tag !== '*')
    .sort((a, b) => b.quality - a.quality);

  if (parts.length === 0) {
    return null;
  }

  return normalizeSeoLocale(parts[0].tag);
}
