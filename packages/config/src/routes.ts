import type { NavItem } from './types'

const DEFAULT_PRIORITY = 100

/** Shell may seed platform-only routes; business nav comes from modules via aggregateNav. */
export const routes: NavItem[] = []

export function aggregateNav(groups: NavItem[][]): NavItem[] {
  return groups.flat().sort((left, right) => {
    const leftPriority = left.priority ?? DEFAULT_PRIORITY
    const rightPriority = right.priority ?? DEFAULT_PRIORITY

    return rightPriority - leftPriority
  })
}
