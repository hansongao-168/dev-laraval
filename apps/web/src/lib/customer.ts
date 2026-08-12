/**
 * apps/web — Customer 业务单文件占位。
 *
 * 设计原则：apps/web 只做"路由装配 + 视图壳"，不写业务逻辑。
 * 真正的业务视图后续会抽到 monorepo modules/auth 与 modules/users，
 * 本文件**仅**放：
 *   1) NavItem 注册（NavRegistry 来源）
 *   2) 共享 Server Action 入口（薄壳，转发到 gz168/Customer 后端）
 *
 * 注意：本文件**不**重复实现 gz168/Customer 已有的 Service/Controller。
 */

import type { Customer, Address, CustomerSettings } from '@erp/api-client'

export interface NavItem {
  id: string
  labelKey: string
  path: string
  icon?: string
  frame?: 'list' | 'detail' | 'auth' | 'workspace' | 'empty'
  deviceVisibility?: Array<'mobile' | 'tablet' | 'desktop'>
  requireAuth?: boolean
  permissions?: string[]
  children?: NavItem[]
  badge?: 'new' | 'beta' | number
  priority?: number
}

// NavRegistry — Customer 模块贡献（与 gz168/Customer/resources/contracts/nav.yaml 一致）
export const customerNav: NavItem[] = [
  {
    id: 'login',
    path: '/login',
    labelKey: 'auth.login',
    frame: 'auth',
    priority: 1,
  },
  {
    id: 'register',
    path: '/register',
    labelKey: 'auth.register',
    frame: 'auth',
    priority: 1,
  },
  {
    id: 'forgot-password',
    path: '/forgot-password',
    labelKey: 'auth.forgot',
    frame: 'auth',
    priority: 1,
  },
  {
    id: 'me',
    path: '/me',
    labelKey: 'nav.me',
    icon: 'user',
    frame: 'detail',
    requireAuth: true,
    priority: 80,
    deviceVisibility: ['mobile', 'tablet', 'desktop'],
    children: [
      {
        id: 'me-settings',
        path: '/me/settings',
        labelKey: 'nav.me.settings',
        frame: 'detail',
        requireAuth: true,
        priority: 80,
      }
    ]
  }
]

// 类型转发：让 apps/web 可以直接消费 @erp/api-client 的 Customer 类型，
// 后续提取 modules/* 时不会改变 import 路径。
export type { Customer, Address, CustomerSettings }