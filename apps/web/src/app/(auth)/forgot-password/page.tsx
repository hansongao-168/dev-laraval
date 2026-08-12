import Link from 'next/link'
import { forgotPasswordAction } from '@/lib/server-customer'

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">找回密码</h1>
      <p className="mb-6 text-sm text-slate-500">输入邮箱，我们会发送重置链接</p>

      <form action={forgotPasswordAction} className="flex flex-col gap-4">
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

        <button
          type="submit"
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
        >
          发送重置邮件
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="text-blue-600 hover:underline">
          返回登录
        </Link>
      </div>
    </div>
  )
}