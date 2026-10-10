'use client'

import { useActionState } from 'react'
import { t } from '../i18n'
import type { AuthFormAction } from '../types'

export function RegisterView({
  action,
  loginHref = '/login',
}: {
  action: AuthFormAction
  loginHref?: string
}) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">{t('register.title')}</h1>
      <p className="mb-6 text-sm text-slate-500">{t('register.subtitle')}</p>
      {state.error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">{t('register.name')}</span>
          <input
            type="text"
            name="name"
            maxLength={80}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder={t('register.namePlaceholder')}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">{t('register.email')}</span>
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
          <span className="text-sm font-medium text-slate-700">{t('register.password')}</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder={t('register.passwordPlaceholder')}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">{t('register.confirmPassword')}</span>
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
          disabled={pending}
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? t('register.submitting') : t('register.submit')}
        </button>
      </form>
      <div className="mt-6 text-center text-sm text-slate-500">
        {t('register.hasAccount')}
        <a href={loginHref} className="ml-1 text-blue-600 hover:underline">
          {t('register.login')}
        </a>
      </div>
    </div>
  )
}
