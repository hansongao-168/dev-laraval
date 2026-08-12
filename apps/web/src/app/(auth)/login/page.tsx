import Link from 'next/link'
import { loginAction } from '@/lib/server-customer'

/**
 * /login — 前台登录页（C7 阶段最小可用版）。
 *
 * 接入 gz168/Customer 的 POST /api/v1/auth/login。
 * 设计稿：详见 docs/architecture/web-frontend.md。
 */
interface LoginPageProps {
  searchParams?: { next?: string; reset?: string }
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const next = searchParams?.next || '/me'
  const resetSent = searchParams?.reset === 'sent'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">登录</h1>
      <p className="mb-6 text-sm text-slate-500">使用邮箱和密码登录你的账号</p>

      {resetSent && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          如账号存在，重置邮件已发送。请查收邮箱。
        </div>
      )}

      <form action={loginAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">邮箱</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">密码</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            minLength={1}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="••••••••"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="remember" className="rounded border-slate-300" />
          保持登录（30 天）
        </label>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
        >
          登录
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
        <Link href="/register" className="text-blue-600 hover:underline">
          注册账号
        </Link>
        <Link href="/forgot-password" className="text-slate-500 hover:text-slate-900">
          忘记密码
        </Link>
      </div>
    </div>
  )
}