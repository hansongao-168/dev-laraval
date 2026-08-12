import Link from 'next/link'
import { getCurrentSession } from '@/lib/server-customer'
import { redirect } from 'next/navigation'

/**
 * (desktop) /me — 个人中心首页。
 *
 * 真实视图后续抽到 @erp/module-users/views/ProfileView（C7.5 阶段）；
 * 当前 C7 阶段先给最小可读版本，复用 server-customer.ts 的 SessionContext。
 */
interface MePageProps {
  searchParams?: { welcome?: string }
}

export default async function MePage({ searchParams }: MePageProps) {
  const session = await getCurrentSession()

  if (session.status === 'anonymous') {
    redirect('/login?next=/me')
  }

  const user = session.user
  if (!user) {
    redirect('/login?next=/me')
  }

  const welcome = searchParams?.welcome === '1'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      {welcome && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          欢迎加入！账号创建成功。
        </div>
      )}
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">个人信息</h1>
      <p className="mb-6 text-sm text-slate-500">查看与更新你的资料</p>

      <dl className="grid grid-cols-[120px_1fr] gap-y-4 text-sm">
        <dt className="text-slate-500">姓名</dt>
        <dd className="text-slate-900">{user.name || '—'}</dd>

        <dt className="text-slate-500">邮箱</dt>
        <dd className="text-slate-900">{user.email}</dd>

        <dt className="text-slate-500">手机</dt>
        <dd className="text-slate-900">{user.phone || '—'}</dd>

        <dt className="text-slate-500">语言</dt>
        <dd className="text-slate-900">{user.locale}</dd>

        <dt className="text-slate-500">时区</dt>
        <dd className="text-slate-900">{user.timezone}</dd>

        <dt className="text-slate-500">邮箱验证</dt>
        <dd>
          {user.email_verified_at ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              已验证
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              未验证
            </span>
          )}
        </dd>
      </dl>

      <div className="mt-8 flex gap-3">
        <Link
          href="/me/settings"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          设置
        </Link>
        <Link
          href="/me/security"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          修改密码
        </Link>
      </div>
    </div>
  )
}