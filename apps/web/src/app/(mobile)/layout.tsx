import type { ReactNode } from 'react'
import Link from 'next/link'
import { getCurrentSession, logoutAction } from '@/lib/server-customer'

/**
 * (mobile) 分组 layout — MobileShell 占位。
 *
 * C7 阶段：顶栏 + 底部 TabBar + 单列内容。
 */
export default async function MobileLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white">
              E
            </span>
            <span className="font-semibold tracking-tight text-slate-900">ERP</span>
          </Link>
          {session.user ? (
            <form action={logoutAction}>
              <button type="submit" className="text-sm text-slate-600">
                退出
              </button>
            </form>
          ) : (
            <Link href="/login" className="text-sm text-blue-600">
              登录
            </Link>
          )}
        </div>
      </header>
      <main className="flex-1 px-4 py-6">{children}</main>
      <nav className="sticky bottom-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-2">
          <Link
            href="/me"
            className="py-3 text-center text-sm font-medium text-slate-700"
          >
            我的
          </Link>
          <Link
            href="/me/settings"
            className="py-3 text-center text-sm font-medium text-slate-700"
          >
            设置
          </Link>
        </div>
      </nav>
    </div>
  )
}