/**
 * apps/web — Customer Server Action / RSC 入口。
 *
 * 用法：
 *   1) Server Component（layout / page）通过 getCurrentSession() 注入 SessionProvider
 *   2) Server Action（form action）通过 loginAction/registerAction 等触发
 *
 * SSR 场景下用 Next 的 cookies() 转发 Sanctum cookie；前端代码
 * **绝不**读取或拼装 token（参考 docs/AI_DEVELOPMENT.md 第 5 条）。
 */

'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createHttp, createCustomerApi } from '@erp/api-client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/v1'

/**
 * SSR 场景下的 http client：把 Next 的 cookies() 透传给 Laravel。
 */
function ssrHttp() {
  return createHttp({
    baseUrl: API_BASE,
    cookies: () => {
      const c = cookies()
      // Next 12+ cookies() 是只读 store；通过 .get 拼成 header
      const all = c.getAll()
      if (!all.length) return undefined
      return all.map(({ name, value }) => `${name}=${value}`).join('; ')
    }
  })
}

export interface SessionContext {
  status: 'anonymous' | 'authenticated' | 'unverified' | 'expired'
  user?: import('@erp/api-client').Customer
}

export async function getCurrentSession(): Promise<SessionContext> {
  const http = ssrHttp()
  const result = await http.request('/api/v1/auth/me', { method: 'GET' })
  if (result.ok) {
    return {
      status: result.data.email_verified_at ? 'authenticated' : 'unverified',
      user: result.data
    }
  }
  if (result.status === 401 || result.status === 419) {
    return { status: 'anonymous' }
  }
  return { status: 'expired' }
}

export async function loginAction(formData: FormData): Promise<void> {
  const http = ssrHttp()
  const customerApi = createCustomerApi(http)
  await customerApi.login({
    email: String(formData.get('email') || ''),
    password: String(formData.get('password') || ''),
    remember: formData.get('remember') === 'on'
  })
  revalidatePath('/', 'layout')
  const next = String(formData.get('next') || '/me')
  redirect(next)
}

export async function registerAction(formData: FormData): Promise<void> {
  const http = ssrHttp()
  const customerApi = createCustomerApi(http)
  await customerApi.register({
    name: String(formData.get('name') || ''),
    email: String(formData.get('email') || ''),
    password: String(formData.get('password') || ''),
    password_confirmation: String(formData.get('password_confirmation') || ''),
    phone: formData.get('phone') ? String(formData.get('phone')) : null,
    locale: formData.get('locale') ? String(formData.get('locale')) : null,
    timezone: formData.get('timezone') ? String(formData.get('timezone')) : null
  })
  revalidatePath('/', 'layout')
  redirect('/me?welcome=1')
}

export async function logoutAction(): Promise<void> {
  const http = ssrHttp()
  const customerApi = createCustomerApi(http)
  await customerApi.logout()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function updateMeAction(formData: FormData): Promise<void> {
  const http = ssrHttp()
  const customerApi = createCustomerApi(http)
  await customerApi.updateMe({
    name: formData.get('name') ? String(formData.get('name')) : null,
    phone: formData.get('phone') ? String(formData.get('phone')) : null,
    locale: formData.get('locale') ? String(formData.get('locale')) : null,
    timezone: formData.get('timezone') ? String(formData.get('timezone')) : null
  })
  revalidatePath('/me')
}

export async function changePasswordAction(formData: FormData): Promise<void> {
  const http = ssrHttp()
  const customerApi = createCustomerApi(http)
  await customerApi.changePassword({
    current_password: String(formData.get('current_password') || ''),
    password: String(formData.get('password') || ''),
    password_confirmation: String(formData.get('password_confirmation') || '')
  })
  redirect('/login')
}

export async function forgotPasswordAction(formData: FormData): Promise<void> {
  const http = ssrHttp()
  const customerApi = createCustomerApi(http)
  await customerApi.forgotPassword({
    email: String(formData.get('email') || '')
  })
  // 防枚举：始终返回 200；前端用 toast 即可
  redirect('/login?reset=sent')
}