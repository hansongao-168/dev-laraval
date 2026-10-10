import { RegisterView } from '@erp/module-auth'
import { getCurrentSession, registerAction } from '@/lib/server-customer'
import { redirect } from 'next/navigation'

export default async function RegisterPage() {
  const session = await getCurrentSession()
  if (session.user) {
    redirect('/me')
  }

  return <RegisterView action={registerAction} />
}
