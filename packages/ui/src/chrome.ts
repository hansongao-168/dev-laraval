import type { DeviceClass } from '@erp/config'

export type { DeviceClass }

export interface ChromeLink {
  key: string
  href: string
  label: string
}

export function splitChromeLinks(
  items: ChromeLink[],
  limit: number,
): { primary: ChromeLink[]; more: ChromeLink[] } {
  if (items.length <= limit) {
    return { primary: items, more: [] }
  }

  return {
    primary: items.slice(0, limit),
    more: items.slice(limit),
  }
}
