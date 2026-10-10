import { ProfileView } from '@erp/module-users'
import { requireAccountSession } from '@/lib/server-customer'

interface MePageProps {
  searchParams?: Promise<{ welcome?: string }>
}

export default async function MePage({ searchParams }: MePageProps) {
  const session = await requireAccountSession('/me')
  const params = searchParams ? await searchParams : {}

  return <ProfileView user={session.user} welcome={params.welcome === '1'} />
}
