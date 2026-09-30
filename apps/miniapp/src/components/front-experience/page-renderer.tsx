import { Text, View } from '@tarojs/components'
import { flattenSlots, resolveBlockComponent } from '@erp/front-experience/core'
import type { ResolvedPage } from '@erp/front-experience/core'
import { miniappBlockRegistry } from './block-registry'

export function PageRenderer ({ page }: { page: ResolvedPage }) {
  const primary = page.skin.tokens?.['color.primary'] ?? '#0F766E'
  const rows = flattenSlots(page.document.shell.slots)

  return (
    <View className='fe-page' style={{ borderTop: `4px solid ${primary}` }}>
      <View className='fe-meta'>
        <Text>skin: {page.skin.code}</Text>
        {page.theme ? <Text> theme: {page.theme.code}</Text> : null}
      </View>
      {rows.map(({ slot, block }) => {
        const Component = resolveBlockComponent(miniappBlockRegistry, block.type) as
          | ((props: { block: typeof block; skin: typeof page.skin; channel: string }) => unknown)
          | null

        return (
          <View key={`${slot}-${block.id}`} className='fe-slot'>
            <Text className='fe-slot-label'>{slot}</Text>
            {Component ? (
              <Component block={block} skin={page.skin} channel='miniapp' />
            ) : (
              <Text>Missing {block.type}</Text>
            )}
          </View>
        )
      })}
    </View>
  )
}
