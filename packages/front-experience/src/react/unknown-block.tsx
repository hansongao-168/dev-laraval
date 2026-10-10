import type { FrontPageBlock } from '../types'

export function UnknownBlock({ block }: { block: FrontPageBlock }) {
  return (
    <section className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
      {block.type}
    </section>
  )
}
