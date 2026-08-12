import Link from 'next/link'
import { registerAction } from '@/lib/server-customer'

export default function RegisterPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">注册账号</h1>
      <p className="mb-6 text-sm text-slate-500">创建你的 ERP Global 账号</p>

      <form action={registerAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">姓名（可选）</span>
          <input
            type="text"
            name="name"
            maxLength={80}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="张三"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">邮箱</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            maxLength={160}
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
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="至少 8 位"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">确认密码</span>
          <input
            type="password"
            name="password_confirmation"
            required
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
        >
          创建账号
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        已有账号？
        <Link href="/login" className="ml-1 text-blue-600 hover:underline">
          登录
        </Link>
      </div>
    </div>
  )
}