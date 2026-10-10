import { SettingsView } from '@erp/module-users'
import { requireAccountSession, updateMeAction } from '@/lib/server-customer'

export default async function SettingsPage() {
  const session = await requireAccountSession('/me/settings')

  return <SettingsView user={session.user} action={updateMeAction} />
}
