import type { ReactNode } from 'react'
import Link from 'next/link'
import { getCurrentSession, logoutAction } from '@/lib/server-customer'

/**
 * (desktop) 分组 layout — DesktopShell 占位。
 *
 * 真实 Shell 组件在后续 M1 阶段抽到 @erp/ui/shells/。
 * C7 阶段先给一个最小的两栏布局：左导航 + 内容区。
 */
export default async function DesktopLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              E
            </span>
            <span className="font-semibold tracking-tight text-slate-900">ERP Global</span>
          </Link>
          <div className="flex items-center gap-3">
            {session.user ? (
              <>
                <span className="text-sm text-slate-600">{session.user.email}</span>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    退出
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        <aside className="w-56 shrink-0">
          <nav className="flex flex-col gap-1">
            <Link
              href="/me"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              我的
            </Link>
            <Link
              href="/me/settings"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              设置
            </Link>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}