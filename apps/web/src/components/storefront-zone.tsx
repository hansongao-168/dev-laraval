'use client'

import { useDeviceClass } from '@erp/devices/react'
import { StorefrontChrome, type ChromeLink } from '@erp/ui'
import type { ReactNode } from 'react'

export function StorefrontZone({
  headerItems,
  footerItems,
  accountSlot,
  children,
}: {
  headerItems: ChromeLink[]
  footerItems: ChromeLink[]
  accountSlot: ReactNode
  children: ReactNode
}) {
  const deviceClass = useDeviceClass()

  return (
    <StorefrontChrome
      deviceClass={deviceClass}
      headerItems={headerItems}
      footerItems={footerItems}
      accountSlot={accountSlot}
    >
      {children}
    </StorefrontChrome>
  )
}
