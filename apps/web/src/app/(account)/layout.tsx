import type { ReactNode } from 'react'
import { AccountZone } from '@/components/account-zone'
import { t } from '@/i18n'
import { getFrontNavSafe } from '@/lib/front-nav'
import { mapFrontNavToChrome } from '@/lib/map-front-nav'
import { logoutAction, requireAccountSession } from '@/lib/server-customer'

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await requireAccountSession('/me')
  const [sidebarNav, mobileNav] = await Promise.all([
    getFrontNavSafe('sidebar'),
    getFrontNavSafe('mobile'),
  ])

  const accountSlot = (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600">{session.user.email}</span>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t('chrome.logout')}
        </button>
      </form>
    </div>
  )

  return (
    <AccountZone
      sidebarItems={mapFrontNavToChrome(sidebarNav)}
      mobileItems={mapFrontNavToChrome(mobileNav)}
      accountSlot={accountSlot}
    >
      {children}
    </AccountZone>
  )
}
