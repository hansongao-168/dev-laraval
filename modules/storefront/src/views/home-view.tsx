import type { FrontPageBlock } from '@erp/front-experience'
import { PageRenderer } from '@erp/front-experience/react'
import { WorkspaceFrame } from '@erp/ui'

const clients = [
  { name: 'Web', framework: 'Next.js 16', description: 'Global website, customer portal, SEO and localization.' },
  { name: 'Mobile', framework: 'Expo SDK 57', description: 'Native iOS and Android applications from one React codebase.' },
  { name: 'China', framework: 'Taro React 4', description: 'WeChat mini program and additional mainland channels.' },
]

function MarketingFallback({ healthUrl }: { healthUrl: string }) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="flex flex-col items-start gap-7">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
          Laravel API · One source of truth
        </span>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
          One ERP platform, built for every market.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-600">
          A production-ready foundation for the web, native mobile apps, and China&apos;s mini-program
          ecosystem—connected through a versioned Laravel API.
        </p>
        <a
          href={healthUrl}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
        >
          Check API
        </a>
      </div>
      <div className="grid gap-4">
        {clients.map((client) => (
          <article
            key={client.name}
            className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-900/5 backdrop-blur"
          >
            <p className="text-xs font-bold tracking-[0.18em] text-blue-600 uppercase">{client.name}</p>
            <h2 className="mt-2 text-lg font-semibold">{client.framework}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{client.description}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

export function HomeView({
  blocks,
  healthUrl,
}: {
  blocks: FrontPageBlock[]
  healthUrl: string
}) {
  return (
    <div className="bg-[radial-gradient(circle_at_top_left,#dbeafe_0,transparent_38%),linear-gradient(135deg,#f8fafc,#eef2ff)]">
      <WorkspaceFrame>
        {blocks.length > 0 ? <PageRenderer blocks={blocks} /> : <MarketingFallback healthUrl={healthUrl} />}
      </WorkspaceFrame>
    </div>
  )
}
