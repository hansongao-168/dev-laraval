import type { ReactNode } from 'react'
import Link from 'next/link'
import { getCurrentSession, logoutAction } from '@/lib/server-customer'

/**
 * (tablet) 分组 layout — TabletShell 占位。
 *
 * C7 阶段：顶栏 + Tabs + 内容；后续抽到 @erp/ui/shells/TabletShell。
 */
export default async function TabletLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white">
              E
            </span>
            <span className="font-semibold tracking-tight text-slate-900">ERP</span>
          </Link>
          <div className="flex items-center gap-2">
            {session.user ? (
              <form action={logoutAction}>
                <button type="submit" className="text-sm text-slate-600 hover:text-slate-900">
                  退出
                </button>
              </form>
            ) : (
              <Link href="/login" className="text-sm text-blue-600">
                登录
              </Link>
            )}
          </div>
        </div>
        <nav className="flex border-t border-slate-200">
          <Link
            href="/me"
            className="flex-1 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            我的
          </Link>
          <Link
            href="/me/settings"
            className="flex-1 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            设置
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  )
}