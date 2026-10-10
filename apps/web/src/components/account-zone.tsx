'use client'

import { useDeviceClass } from '@erp/devices/react'
import { AccountChrome, type ChromeLink } from '@erp/ui'
import type { ReactNode } from 'react'

export function AccountZone({
  sidebarItems,
  mobileItems,
  accountSlot,
  children,
}: {
  sidebarItems: ChromeLink[]
  mobileItems: ChromeLink[]
  accountSlot: ReactNode
  children: ReactNode
}) {
  const deviceClass = useDeviceClass()

  return (
    <AccountChrome
      deviceClass={deviceClass}
      sidebarItems={sidebarItems}
      mobileItems={mobileItems}
      accountSlot={accountSlot}
    >
      {children}
    </AccountChrome>
  )
}
