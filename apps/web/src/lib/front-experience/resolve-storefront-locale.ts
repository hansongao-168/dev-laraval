import { headers } from 'next/headers';
import { getCurrentSession } from '@/lib/server-customer';
import { localeFromAcceptLanguage, pickLocaleCandidate } from './seo-locale.mjs';

/**
 * Resolve storefront SEO locale:
 * query override → authenticated user locale → Accept-Language → zh_CN.
 */
export async function resolveStorefrontLocale(
  explicit?: string | null,
): Promise<string> {
  if (typeof explicit === 'string' && explicit.trim() !== '') {
    return pickLocaleCandidate(explicit);
  }

  let userLocale: string | null | undefined;
  try {
    const session = await getCurrentSession();
    userLocale = session.user?.locale ?? null;
  } catch {
    userLocale = null;
  }

  if (typeof userLocale === 'string' && userLocale.trim() !== '') {
    return pickLocaleCandidate(userLocale);
  }

  try {
    const headerStore = await headers();
    const fromHeader = localeFromAcceptLanguage(headerStore.get('accept-language'));
    if (fromHeader) {
      return fromHeader;
    }
  } catch {
    // headers() unavailable outside a request — fall through.
  }

  return pickLocaleCandidate(null);
}
