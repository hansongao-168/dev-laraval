import { createApiClient } from '@erp/api-client'

const clients = [
  { name: 'Web', framework: 'Next.js 16', description: 'Global website, customer portal, SEO and localization.' },
  { name: 'Mobile', framework: 'Expo SDK 57', description: 'Native iOS and Android applications from one React codebase.' },
  { name: 'China', framework: 'Taro React 4', description: 'WeChat mini program and additional mainland channels.' },
]

export default function StorefrontHomePage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api/v1'
  const api = createApiClient({ baseUrl: apiUrl })

  return (
    <div className="bg-[radial-gradient(circle_at_top_left,#dbeafe_0,transparent_38%),linear-gradient(135deg,#f8fafc,#eef2ff)] px-6 py-12 sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
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
            href={api.url('/health')}
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
    </div>
  )
}
