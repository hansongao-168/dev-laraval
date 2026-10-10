import type { FrontPageBlock } from '@erp/front-experience'
import { View } from '@tarojs/components'
import type { ReactNode } from 'react'
import { createMiniappBlockRegistry, renderUnknownBlock } from './registry'

const registry = createMiniappBlockRegistry()

export function PageRenderer({ blocks }: { blocks: FrontPageBlock[] }) {
  if (blocks.length === 0) {
    return null
  }

  return (
    <View className='fe-root'>
      {blocks.map((block, index) => {
        const render = registry.resolve(block.type)
        const content = render ? render({ block }) : renderUnknownBlock(block)

        return (
          <View key={block.id || `${block.type}-${index}`} className='fe-block'>
            {content as ReactNode}
          </View>
        )
      })}
    </View>
  )
}
