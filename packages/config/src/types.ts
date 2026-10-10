export type DeviceClass = 'mobile' | 'tablet' | 'desktop'

export type FrameId = 'list' | 'detail' | 'auth' | 'workspace' | 'empty'

export interface NavItem {
  id: string
  labelKey: string
  path: string
  icon?: string
  frame: FrameId
  deviceVisibility?: DeviceClass[]
  requireAuth?: boolean
  permissions?: string[]
  children?: NavItem[]
  badge?: 'new' | 'beta' | number
  priority?: number
}
