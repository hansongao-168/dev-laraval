import type { NavItem } from '@erp/config'

export function flattenNav(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNav(item.children) : [])])
}

export function resolveActiveNav(items: NavItem[], pathname: string): NavItem | null {
  const flat = flattenNav(items)
  const exact = flat.find((item) => item.path === pathname)
  if (exact) {
    return exact
  }

  return (
    flat
      .filter((item) => item.path !== '/' && pathname.startsWith(`${item.path}/`))
      .sort((left, right) => right.path.length - left.path.length)[0] ?? null
  )
}
