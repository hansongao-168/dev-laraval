import type { BlockRenderer, FrontPageBlock } from './types'

export interface BlockRegistry {
  register(type: string, render: BlockRenderer): void
  resolve(type: string): BlockRenderer | null
  types(): string[]
}

export function createBlockRegistry(seed: Record<string, BlockRenderer> = {}): BlockRegistry {
  const map = new Map<string, BlockRenderer>(Object.entries(seed))

  return {
    register(type, render) {
      map.set(type, render)
    },
    resolve(type) {
      return map.get(type) ?? null
    },
    types() {
      return [...map.keys()].sort()
    },
  }
}

export function renderBlock(
  registry: BlockRegistry,
  block: FrontPageBlock,
  fallback: BlockRenderer,
): unknown {
  const render = registry.resolve(block.type) ?? fallback

  return render({ block })
}
