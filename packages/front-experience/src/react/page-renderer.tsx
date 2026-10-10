import type { ReactNode } from 'react'
import { createBlockRegistry, type BlockRegistry } from '../registry'
import type { FrontPageBlock } from '../types'
import { mallBlockRenderers } from './mall-blocks'
import { UnknownBlock } from './unknown-block'

function seedMallRegistry(): BlockRegistry {
  const registry = createBlockRegistry()

  for (const [type, Component] of Object.entries(mallBlockRenderers)) {
    registry.register(type, ({ block }) => <Component block={block} />)
  }

  return registry
}

const defaultRegistry = seedMallRegistry()

export function createDefaultBlockRegistry(): BlockRegistry {
  return seedMallRegistry()
}

export function PageRenderer({
  blocks,
  registry = defaultRegistry,
}: {
  blocks: FrontPageBlock[]
  registry?: BlockRegistry
}): ReactNode {
  if (blocks.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-10">
      {blocks.map((block, index) => {
        const render = registry.resolve(block.type)
        const content = render
          ? (render({ block }) as ReactNode)
          : <UnknownBlock block={block} />

        return (
          <div key={block.id || `${block.type}-${index}`}>
            {content}
          </div>
        )
      })}
    </div>
  )
}
