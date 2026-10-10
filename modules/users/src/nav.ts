import type { NavItem } from '@erp/config'

export const nav: NavItem[] = [
  { id: 'me', labelKey: 'nav.me', path: '/me', frame: 'detail', requireAuth: true, priority: 90 },
  {
    id: 'settings',
    labelKey: 'nav.settings',
    path: '/me/settings',
    frame: 'empty',
    requireAuth: true,
    priority: 80,
  },
  {
    id: 'security',
    labelKey: 'nav.security',
    path: '/me/security',
    frame: 'empty',
    requireAuth: true,
    priority: 70,
  },
]
