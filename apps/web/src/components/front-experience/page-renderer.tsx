import type { CSSProperties, ReactNode } from 'react';
import { flattenSlots, resolveBlockComponent } from '@erp/front-experience/core';
import type { ResolvedPage } from '@erp/front-experience/core';
import { webBlockRegistry } from './block-registry';

export function PageRenderer({
  page,
  channel = 'web',
}: {
  page: ResolvedPage;
  channel?: string;
}) {
  const tokens = page.skin.tokens ?? {};
  const primary = tokens['color.primary'] ?? '#0F766E';
  const rows = flattenSlots(page.document.shell.slots);

  return (
    <div
      className="space-y-4"
      style={{ ['--color-primary' as string]: primary } as CSSProperties}
    >
      {rows.length === 0 ? (
        <p className="text-sm italic text-slate-500">暂无内容</p>
      ) : (
        rows.map(({ slot, block }) => {
          const Component = resolveBlockComponent(webBlockRegistry, block.type) as
            | ((props: {
                block: typeof block;
                skin: typeof page.skin;
                channel: string;
              }) => ReactNode)
            | null;

          return (
            <section key={`${slot}-${block.id}`} data-slot={slot} className="space-y-1">
              {Component ? (
                <Component block={block} skin={page.skin} channel={channel} />
              ) : (
                <div className="text-sm text-rose-600">未知区块: {block.type}</div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
