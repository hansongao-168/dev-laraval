import type { NavItem } from '@erp/config'

export const nav: NavItem[] = [
  { id: 'home', labelKey: 'nav.home', path: '/', frame: 'workspace', priority: 200 },
  { id: 'products', labelKey: 'nav.products', path: '/products', frame: 'list', priority: 180 },
  { id: 'nav-demo', labelKey: 'nav.demo', path: '/nav-demo', frame: 'empty', priority: 40 },
]
