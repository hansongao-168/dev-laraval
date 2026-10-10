import type { ReactNode } from 'react'
import Link from 'next/link'
import { StorefrontZone } from '@/components/storefront-zone'
import { t } from '@/i18n'
import { getFrontNavSafe } from '@/lib/front-nav'
import { mapFrontNavToChrome } from '@/lib/map-front-nav'
import { getCurrentSession } from '@/lib/server-customer'

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession()
  const [headerNav, footerNav] = await Promise.all([
    getFrontNavSafe('header'),
    getFrontNavSafe('footer'),
  ])

  const accountSlot = session.user ? (
    <Link href="/me" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800">
      {t('chrome.me')}
    </Link>
  ) : (
    <Link
      href="/login?next=/me"
      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
    >
      {t('chrome.login')}
    </Link>
  )

  return (
    <StorefrontZone
      headerItems={mapFrontNavToChrome(headerNav)}
      footerItems={mapFrontNavToChrome(footerNav)}
      accountSlot={accountSlot}
    >
      {children}
    </StorefrontZone>
  )
}
