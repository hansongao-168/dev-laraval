import type { NavItem } from '@erp/config'

export const nav: NavItem[] = [
  { id: 'login', labelKey: 'nav.login', path: '/login', frame: 'auth', priority: 20 },
  { id: 'register', labelKey: 'nav.register', path: '/register', frame: 'auth', priority: 10 },
  {
    id: 'forgot-password',
    labelKey: 'nav.forgotPassword',
    path: '/forgot-password',
    frame: 'auth',
    priority: 5,
  },
]
