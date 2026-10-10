'use client'

import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react'
import { routes, type NavItem } from '@erp/config'
import { flattenNav, resolveActiveNav } from './nav-resolve'

interface NavRegistryValue {
  items: NavItem[]
  flatten: () => NavItem[]
  resolveActive: (pathname: string) => NavItem | null
}

const NavRegistryContext = createContext<NavRegistryValue | null>(null)

export function NavRegistryProvider({
  children,
  items = routes,
}: {
  children: ReactNode
  items?: NavItem[]
}) {
  const value = useMemo<NavRegistryValue>(() => {
    const flat = flattenNav(items)

    return {
      items,
      flatten: () => flat,
      resolveActive: (pathname: string) => resolveActiveNav(items, pathname),
    }
  }, [items])

  return createElement(NavRegistryContext.Provider, { value }, children)
}

export function useNav(): NavRegistryValue {
  const value = useContext(NavRegistryContext)

  if (value === null) {
    throw new Error('useNav must be used within NavRegistryProvider')
  }

  return value
}
