import type { DeviceClass, NavItem } from '@erp/config'

function flattenNavItems(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [
    item,
    ...(item.children ? flattenNavItems(item.children) : []),
  ])
}

export interface CommandItem {
  id: string
  path: string
  label: string
  priority: number
}

export function labelFromKey(labelKey: string): string {
  const leaf = labelKey.includes('.') ? labelKey.slice(labelKey.lastIndexOf('.') + 1) : labelKey
  const spaced = leaf.replaceAll(/([A-Z])/g, ' $1').trim()

  return spaced.length === 0 ? labelKey : `${spaced[0]?.toUpperCase() ?? ''}${spaced.slice(1)}`
}

export function navItemsToCommands(items: NavItem[]): CommandItem[] {
  return flattenNavItems(items)
    .filter((item) => item.path.length > 0)
    .map((item) => ({
      id: item.id,
      path: item.path,
      label: labelFromKey(item.labelKey),
      priority: item.priority ?? 100,
    }))
    .sort((left, right) => right.priority - left.priority)
}

export function commandsVisibleOnDevice(items: NavItem[], deviceClass: DeviceClass): NavItem[] {
  return flattenNavItems(items).filter((item) => {
    if (!item.deviceVisibility || item.deviceVisibility.length === 0) {
      return true
    }

    return item.deviceVisibility.includes(deviceClass)
  })
}
