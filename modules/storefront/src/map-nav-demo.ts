import type { FrontNavDemoItem } from './types'

export interface FrontNavSourceItem {
  key: string
  label: string
  url: string
  icon?: string | null
  requiresAuth: boolean
  children?: Array<{
    key: string
    label: string
    url: string
  }> | null
}

export function mapNavDemoItems(items: FrontNavSourceItem[]): FrontNavDemoItem[] {
  return items.map((item) => ({
    key: item.key,
    label: item.label,
    url: item.url,
    icon: item.icon ?? null,
    requiresAuth: item.requiresAuth,
    children: (item.children ?? []).map((child) => ({
      key: child.key,
      label: child.label,
      url: child.url,
    })),
  }))
}
