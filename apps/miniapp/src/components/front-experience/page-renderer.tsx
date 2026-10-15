import { Text, View } from '@tarojs/components'
import { flattenSlots, resolveBlockComponent } from '@erp/front-experience/core'
import type { ResolvedPage } from '@erp/front-experience/core'
import { miniappBlockRegistry } from './block-registry'

export function PageRenderer ({ page }: { page: ResolvedPage }) {
  const primary = page.skin.tokens?.['color.primary'] ?? '#0F766E'
  const rows = flattenSlots(page.document.shell.slots)

  return (
    <View className='fe-page' style={{ borderTop: `4px solid ${primary}` }}>
      {rows.map(({ slot, block }) => {
        const Component = resolveBlockComponent(miniappBlockRegistry, block.type) as
          | ((props: { block: typeof block; skin: typeof page.skin; channel: string }) => unknown)
          | null

        return (
          <View key={`${slot}-${block.id}`} className='fe-slot'>
            {Component ? (
              <Component block={block} skin={page.skin} channel='miniapp' />
            ) : (
              <Text>未知区块: {block.type}</Text>
            )}
          </View>
        )
      })}
    </View>
  )
}
