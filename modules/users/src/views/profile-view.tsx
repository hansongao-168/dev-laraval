import type { Customer } from '@erp/api-client'
import { DetailFrame } from '@erp/ui'
import { t } from '../i18n'

export function ProfileView({
  user,
  welcome,
  settingsHref = '/me/settings',
  securityHref = '/me/security',
}: {
  user: Customer
  welcome?: boolean
  settingsHref?: string
  securityHref?: string
}) {
  return (
    <DetailFrame title={t('profile.title')} description={t('profile.description')}>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {welcome ? (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {t('profile.welcome')}
          </div>
        ) : null}
        <dl className="grid grid-cols-[120px_1fr] gap-y-4 text-sm">
          <dt className="text-slate-500">{t('profile.name')}</dt>
          <dd className="text-slate-900">{user.name || '—'}</dd>
          <dt className="text-slate-500">{t('profile.email')}</dt>
          <dd className="text-slate-900">{user.email}</dd>
          <dt className="text-slate-500">{t('profile.phone')}</dt>
          <dd className="text-slate-900">{user.phone || '—'}</dd>
          <dt className="text-slate-500">{t('profile.locale')}</dt>
          <dd className="text-slate-900">{user.locale}</dd>
          <dt className="text-slate-500">{t('profile.timezone')}</dt>
          <dd className="text-slate-900">{user.timezone}</dd>
          <dt className="text-slate-500">{t('profile.emailVerified')}</dt>
          <dd>
            {user.email_verified_at ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {t('profile.verified')}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {t('profile.unverified')}
              </span>
            )}
          </dd>
        </dl>
        <div className="mt-8 flex gap-3">
          <a
            href={settingsHref}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t('profile.settings')}
          </a>
          <a
            href={securityHref}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t('profile.security')}
          </a>
        </div>
      </div>
    </DetailFrame>
  )
}
