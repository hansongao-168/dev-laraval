import { HomeView } from '@erp/module-storefront'
import { createApiClient } from '@erp/api-client'
import { getFrontPageSafe } from '@/lib/front-page'
import { laravelOrigin } from '@/lib/ssr-http'

export default async function StorefrontHomePage() {
  const document = await getFrontPageSafe('home')
  const main = document?.shell?.slots?.main ?? []
  const api = createApiClient({ baseUrl: laravelOrigin() })

  return <HomeView blocks={main} healthUrl={api.url('/api/v1/health')} />
}
