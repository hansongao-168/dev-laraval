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
      style={
        {
          ['--color-primary' as string]: primary,
        } as CSSProperties
      }
    >
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>
          skin: <code className="text-slate-800">{page.skin.code}</code>
        </span>
        {page.theme ? (
          <span>
            theme: <code className="text-slate-800">{page.theme.code}</code>
          </span>
        ) : (
          <span>theme: none</span>
        )}
        <span
          className="inline-block size-3 rounded-full"
          style={{ background: primary }}
          title="color.primary"
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm italic text-slate-500">No blocks in document slots.</p>
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
              <div className="text-[10px] uppercase tracking-wide text-slate-400">{slot}</div>
              {Component ? (
                <Component block={block} skin={page.skin} channel={channel} />
              ) : (
                <div className="text-sm text-rose-600">Missing registry entry for {block.type}</div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
