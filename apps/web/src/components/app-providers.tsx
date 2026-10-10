'use client'

import type { ReactNode } from 'react'
import type { DeviceClass, NavItem } from '@erp/config'
import { DeviceProvider } from '@erp/devices/react'
import { NavRegistryProvider } from '@erp/ui'
import { CommandPaletteHost } from '@/components/command-palette-host'

export function AppProviders({
  initialDeviceClass,
  navItems,
  children,
}: {
  initialDeviceClass: DeviceClass
  navItems?: NavItem[]
  children: ReactNode
}) {
  return (
    <DeviceProvider initialDeviceClass={initialDeviceClass}>
      <NavRegistryProvider items={navItems}>
        {children}
        <CommandPaletteHost />
      </NavRegistryProvider>
    </DeviceProvider>
  )
}
