import type { FrontPageBlock } from '@erp/front-experience'
import { useMemo, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { createMobileBlockRegistry, renderUnknownBlock } from './registry'

const registry = createMobileBlockRegistry()

export function PageRenderer({ blocks }: { blocks: FrontPageBlock[] }) {
  const nodes = useMemo(
    () =>
      blocks.map((block, index) => {
        const render = registry.resolve(block.type)
        const content = render ? render({ block }) : renderUnknownBlock(block)

        return (
          <View key={block.id || `${block.type}-${index}`} style={styles.block}>
            {content as ReactNode}
          </View>
        )
      }),
    [blocks],
  )

  if (blocks.length === 0) {
    return null
  }

  return <View style={styles.root}>{nodes}</View>
}

const styles = StyleSheet.create({
  root: {
    gap: 28,
  },
  block: {
    width: '100%',
  },
})
