import type { Customer } from '@erp/api-client'
import { t } from '../i18n'
import type { FormAction } from '../types'

export function SettingsView({ user, action }: { user: Customer; action: FormAction }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">{t('settings.title')}</h1>
      <p className="mb-6 text-sm text-slate-500">{t('settings.subtitle')}</p>
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">{t('settings.name')}</span>
          <input
            type="text"
            name="name"
            defaultValue={user.name ?? ''}
            maxLength={80}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">{t('settings.phone')}</span>
          <input
            type="tel"
            name="phone"
            defaultValue={user.phone ?? ''}
            maxLength={20}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">{t('settings.locale')}</span>
            <select
              name="locale"
              defaultValue={user.locale}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="zh-CN">{t('settings.localeZh')}</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">{t('settings.timezone')}</span>
            <input
              type="text"
              name="timezone"
              defaultValue={user.timezone}
              maxLength={64}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-2 self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
        >
          {t('settings.save')}
        </button>
      </form>
    </div>
  )
}
