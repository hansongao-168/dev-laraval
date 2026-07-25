import { createApiClient } from "@erp/api-client";

const clients = [
  {
    name: "Web",
    framework: "Next.js 16",
    description: "Global website, customer portal, SEO and localization.",
  },
  {
    name: "Mobile",
    framework: "Expo SDK 57",
    description: "Native iOS and Android applications from one React codebase.",
  },
  {
    name: "China",
    framework: "Taro React 4",
    description: "WeChat mini program and additional mainland channels.",
  },
];

export default function Home() {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost/api/v1";
  const api = createApiClient({ baseUrl: apiUrl });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,transparent_38%),linear-gradient(135deg,#f8fafc,#eef2ff)] px-6 py-8 text-slate-950 sm:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/25">
              E
            </span>
            <div>
              <p className="font-semibold tracking-tight">ERP Global</p>
              <p className="text-xs text-slate-500">Global first · China ready</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
            Foundation ready
          </span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col items-start gap-7">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
              Laravel API · One source of truth
            </span>
            <div className="flex flex-col gap-5">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
                One ERP platform, built for every market.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                A production-ready foundation for the web, native mobile apps,
                and China&apos;s mini-program ecosystem—connected through a
                versioned Laravel API.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={api.url("/health")}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
              >
                Check API
              </a>
              <span className="rounded-xl border border-slate-200 bg-white/80 px-5 py-3 font-mono text-xs text-slate-600 shadow-sm">
                {apiUrl}
              </span>
            </div>
          </div>

          <div className="grid gap-4">
            {clients.map((client) => (
              <article
                key={client.name}
                className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-900/5 backdrop-blur"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-bold tracking-[0.18em] text-blue-600 uppercase">
                      {client.name}
                    </p>
                    <h2 className="text-lg font-semibold">{client.framework}</h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {client.description}
                    </p>
                  </div>
                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-emerald-400 ring-4 ring-emerald-100" />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
