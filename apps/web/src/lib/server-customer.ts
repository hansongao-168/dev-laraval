/**
 * apps/web — Customer Server Action / RSC 入口。
 *
 * SSR 把 Next cookies() + Origin 转给 Laravel Sanctum；绝不把 token 放进 LocalStorage。
 */

'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { Customer } from '@erp/api-client'
import type { AuthFormState } from '@erp/module-auth'
import { t } from '@/i18n'
import { safeInternalPath } from '@/lib/safe-internal-path'
import { ssrHttp } from '@/lib/ssr-http'

export interface SessionContext {
  status: 'anonymous' | 'authenticated' | 'unverified' | 'expired'
  user?: Customer
}

function customerFromPayload(data: unknown): Customer | undefined {
  if (!data || typeof data !== 'object') {
    return undefined
  }

  const record = data as Record<string, unknown>
  const inner = record.data
  if (inner && typeof inner === 'object' && inner !== null && 'email' in inner) {
    return inner as Customer
  }

  if ('email' in record) {
    return record as unknown as Customer
  }

  return undefined
}

export async function getCurrentSession(): Promise<SessionContext> {
  const http = await ssrHttp()
  const result = await http.request('/api/v1/auth/me', { method: 'GET' })
  if (result.ok) {
    const user = customerFromPayload(result.data)
    if (!user) {
      return { status: 'anonymous' }
    }

    return {
      status: user.email_verified_at ? 'authenticated' : 'unverified',
      user,
    }
  }
  if (result.status === 401 || result.status === 419 || result.status === 0) {
    return { status: 'anonymous' }
  }
  return { status: 'expired' }
}

export async function requireAccountSession(next = '/me'): Promise<SessionContext & { user: Customer }> {
  const session = await getCurrentSession()
  if (session.status === 'anonymous' || !session.user) {
    redirect(`/login?next=${encodeURIComponent(safeInternalPath(next))}`)
  }

  return session as SessionContext & { user: Customer }
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const http = await ssrHttp()
  const result = await http.request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: String(formData.get('email') || ''),
      password: String(formData.get('password') || ''),
      remember: formData.get('remember') === 'on',
    },
  })

  if (!result.ok) {
    return { error: t('auth.loginInvalid') }
  }

  revalidatePath('/', 'layout')
  redirect(safeInternalPath(String(formData.get('next') || '/me')))
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const http = await ssrHttp()
  const result = await http.request('/api/v1/auth/register', {
    method: 'POST',
    body: {
      name: String(formData.get('name') || '') || null,
      email: String(formData.get('email') || ''),
      password: String(formData.get('password') || ''),
      password_confirmation: String(formData.get('password_confirmation') || ''),
      phone: formData.get('phone') ? String(formData.get('phone')) : null,
      locale: formData.get('locale') ? String(formData.get('locale')) : null,
      timezone: formData.get('timezone') ? String(formData.get('timezone')) : null,
    },
  })

  if (!result.ok) {
    return { error: t('auth.registerFailed') }
  }

  revalidatePath('/', 'layout')
  redirect('/me?welcome=1')
}

export async function logoutAction(): Promise<void> {
  const http = await ssrHttp()
  await http.request('/api/v1/auth/logout', { method: 'POST' })
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function updateMeAction(formData: FormData): Promise<void> {
  const http = await ssrHttp()
  await http.request('/api/v1/auth/me', {
    method: 'PATCH',
    body: {
      name: formData.get('name') ? String(formData.get('name')) : null,
      phone: formData.get('phone') ? String(formData.get('phone')) : null,
      locale: formData.get('locale') ? String(formData.get('locale')) : null,
      timezone: formData.get('timezone') ? String(formData.get('timezone')) : null,
    },
  })
  revalidatePath('/me')
}

export async function changePasswordAction(formData: FormData): Promise<void> {
  const http = await ssrHttp()
  await http.request('/api/v1/auth/me/password', {
    method: 'POST',
    body: {
      current_password: String(formData.get('current_password') || ''),
      password: String(formData.get('password') || ''),
      password_confirmation: String(formData.get('password_confirmation') || ''),
    },
  })
  redirect('/login')
}

export async function forgotPasswordAction(formData: FormData): Promise<void> {
  const http = await ssrHttp()
  await http.request('/api/v1/auth/password/forgot', {
    method: 'POST',
    body: {
      email: String(formData.get('email') || ''),
    },
  })
  redirect('/login?reset=sent')
}
