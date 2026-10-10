import { LoginView } from '@erp/module-auth'
import { redirect } from 'next/navigation'
import { getCurrentSession, loginAction } from '@/lib/server-customer'
import { safeInternalPath } from '@/lib/safe-internal-path'

interface LoginPageProps {
  searchParams?: Promise<{ next?: string; reset?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getCurrentSession()
  if (session.user) {
    redirect('/me')
  }

  const params = searchParams ? await searchParams : {}

  return (
    <LoginView
      next={safeInternalPath(params.next)}
      resetSent={params.reset === 'sent'}
      action={loginAction}
    />
  )
}
