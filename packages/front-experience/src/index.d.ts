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

export interface BlockRegistry {
  register(type: string, render: BlockRenderer): void
  resolve(type: string): BlockRenderer | null
  types(): string[]
}

export function asRecords(value: unknown): Record<string, unknown>[]
export function stringProp(record: Record<string, unknown>, keys: string[]): string
export function createBlockRegistry(seed?: Record<string, BlockRenderer>): BlockRegistry
export function renderBlock(
  registry: BlockRegistry,
  block: FrontPageBlock,
  fallback: BlockRenderer,
): unknown

export interface FrontPageHttp {
  request<T = unknown>(
    path: string,
    options?: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' },
  ): Promise<{ ok: boolean; status: number; data: T }>
}

export function fetchFrontPageDocument(
  http: FrontPageHttp,
  slug: string,
  channel?: string,
): Promise<FrontPageDocument | null>

export function mainBlocks(document: FrontPageDocument | null): FrontPageBlock[]
