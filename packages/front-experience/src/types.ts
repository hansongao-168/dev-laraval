export interface FrontPageBlock {
  id?: string
  type: string
  props?: Record<string, unknown>
  callResult?: unknown
}

export interface FrontPageDocument {
  page?: {
    title?: Record<string, string> | string
    slug?: string
  }
  shell?: {
    slots?: Record<string, FrontPageBlock[]>
  }
}

export type BlockRenderer = (props: { block: FrontPageBlock }) => unknown
