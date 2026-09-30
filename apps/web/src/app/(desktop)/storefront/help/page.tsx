import Link from 'next/link';
import type { Metadata } from 'next';
import { resolvePageShareImage } from '@erp/front-experience/core';
import { PageRenderer } from '@/components/front-experience/page-renderer';
import { ShareButton } from '@/components/front-experience/share-button';
import { getFrontPage } from '@/lib/front-experience/server';
import { resolveStorefrontLocale } from '@/lib/front-experience/resolve-storefront-locale';
import { buildStorefrontMetadata } from '@/lib/front-experience/seo';

function siteBase(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_WEB_URL ??
    'http://localhost:3000'
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    faqPage?: string;
    at?: string;
    theme?: string;
    skin?: string;
    locale?: string;
  }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const page = await getFrontPage({
    slug: 'help',
    channel: 'web',
    q: params.q,
    page: params.page,
    query: params.faqPage ? { faqPage: params.faqPage } : undefined,
    at: params.at,
    theme: params.theme,
    skin: params.skin,
  });

  const query = new URLSearchParams();
  if (params.q) {
    query.set('q', params.q);
  }
  if (params.page) {
    query.set('page', params.page);
  }
  if (params.faqPage) {
    query.set('faqPage', params.faqPage);
  }
  const qs = query.toString();

  return buildStorefrontMetadata({
    page,
    fallbackTitle: 'Help',
    path: `/storefront/help${qs ? `?${qs}` : ''}`,
    locale: await resolveStorefrontLocale(params.locale),
  });
}

export default async function StorefrontHelpPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    faqPage?: string;
    at?: string;
    theme?: string;
    skin?: string;
    locale?: string;
  }>;
}) {
  const params = await searchParams;
  const locale = await resolveStorefrontLocale(params.locale);
  const page = await getFrontPage({
    slug: 'help',
    channel: 'web',
    q: params.q,
    page: params.page,
    query: params.faqPage ? { faqPage: params.faqPage } : undefined,
    at: params.at,
    theme: params.theme,
    skin: params.skin,
  });

  const title =
    page.document.page.title?.zh_CN ??
    page.document.page.title?.en ??
    page.document.page.slug;

  const description =
    page.document.meta && typeof page.document.meta === 'object'
      ? (page.document.meta as { seo?: { description?: string } }).seo?.description
      : undefined;

  const shareImage = resolvePageShareImage(page, locale, siteBase());

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Resolved from <code>GET /api/v1/front-pages/help</code>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-teal-700">
          <ShareButton title={title} text={description ?? title} image={shareImage} />
          <Link href="/storefront" className="hover:underline">
            ← Storefront
          </Link>
          <Link href="/dev/front-studio" className="hover:underline">
            Front Studio →
          </Link>
        </div>
      </div>

      <PageRenderer page={page} channel="web" />
    </div>
  );
}
