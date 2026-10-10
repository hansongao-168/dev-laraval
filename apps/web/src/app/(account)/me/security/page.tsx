import { SecurityView } from '@erp/module-users'
import { requireAccountSession, changePasswordAction } from '@/lib/server-customer'

export default async function SecurityPage() {
  await requireAccountSession('/me/security')

  return <SecurityView action={changePasswordAction} />
}
