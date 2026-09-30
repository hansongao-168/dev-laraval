import type { ReactNode } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { flattenSlots, resolveBlockComponent } from '@erp/front-experience/core';
import type { ResolvedPage } from '@erp/front-experience/core';
import { mobileBlockRegistry } from './block-registry';

export function PageRenderer({ page }: { page: ResolvedPage }) {
  const primary = page.skin.tokens?.['color.primary'] ?? '#0F766E';
  const rows = flattenSlots(page.document.shell.slots);

  return (
    <View style={[styles.page, { borderTopColor: primary }]}>
      <Text style={styles.meta}>
        skin: {page.skin.code}
        {page.theme ? ` · theme: ${page.theme.code}` : ''}
      </Text>
      {rows.map(({ slot, block }) => {
        const Component = resolveBlockComponent(mobileBlockRegistry, block.type) as
          | ((props: {
              block: typeof block;
              skin: typeof page.skin;
              channel: string;
            }) => ReactNode)
          | null;

        return (
          <View key={`${slot}-${block.id}`} style={styles.slot}>
            <Text style={styles.slotLabel}>{slot}</Text>
            {Component ? (
              <Component block={block} skin={page.skin} channel="mobile" />
            ) : (
              <Text>Missing {block.type}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    borderTopWidth: 4,
    gap: 12,
  },
  meta: {
    fontSize: 12,
    color: '#64748b',
  },
  slot: {
    gap: 4,
  },
  slotLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
});
