import type { ReactNode } from 'react'
import Link from 'next/link'
import { getCurrentSession } from '@/lib/server-customer'

/**
 * (storefront) zone layout — minimal header/footer (site IA A).
 * FrontPage Document + storefront.main ExperienceShell come in later milestones.
 */
export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession()

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              E
            </span>
            <span className="font-semibold tracking-tight">ERP Global</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-700">
            <Link href="/" className="hover:text-slate-900">
              首页
            </Link>
            <Link href="/products" className="hover:text-slate-900">
              产品
            </Link>
            <Link href="/nav-demo" className="hover:text-slate-900">
              导航演示
            </Link>
            {session.user ? (
              <Link href="/me" className="rounded-lg bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800">
                我的
              </Link>
            ) : (
              <Link href="/login?next=/me" className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">
                登录
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-6 py-8 text-sm text-slate-600">
          <span>© ERP Global</span>
          <Link href="/products" className="hover:text-slate-900">
            产品
          </Link>
          <Link href="/login" className="hover:text-slate-900">
            登录
          </Link>
        </div>
      </footer>
    </div>
  )
}
