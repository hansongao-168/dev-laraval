import type { NavItem } from '@erp/front-nav/core'

interface ChromeLink {
  key: string
  href: string
  label: string
}

export function mapFrontNavToChrome(items: NavItem[]): ChromeLink[] {
  return items
    .filter((item) => item.enabled)
    .slice()
    .sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0))
    .map((item) => ({
      key: item.key,
      href: item.url || `/${item.key}`,
      label: item.label || item.labelKey || item.key,
    }))
}
