export type { FrontPageBlock } from '@erp/front-experience'

export interface FrontNavDemoItem {
  key: string
  label: string
  url: string
  icon?: string | null
  requiresAuth: boolean
  children: Array<{
    key: string
    label: string
    url: string
  }>
}
