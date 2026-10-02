import { redirect } from 'next/navigation'
import { getCurrentSession, changePasswordAction } from '@/lib/server-customer'

export default async function SecurityPage() {
  const session = await getCurrentSession()
  if (session.status === 'anonymous' || !session.user) {
    redirect('/login?next=/me/security')
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">修改密码</h1>
      <p className="mb-6 text-sm text-slate-500">修改后会自动登出其它设备</p>

      <form action={changePasswordAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">当前密码</span>
          <input
            type="password"
            name="current_password"
            required
            autoComplete="current-password"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">新密码</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">确认新密码</span>
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
          className="mt-2 self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
        >
          修改密码
        </button>
      </form>
    </div>
  )
}