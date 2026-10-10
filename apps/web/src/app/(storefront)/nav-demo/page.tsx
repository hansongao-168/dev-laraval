import { NavDemoView, mapNavDemoItems } from '@erp/module-storefront'
import { getFrontNavSafe } from '@/lib/front-nav'

export default async function NavDemoPage() {
  const [sidebar, header] = await Promise.all([
    getFrontNavSafe('sidebar'),
    getFrontNavSafe('header'),
  ])

  return <NavDemoView header={mapNavDemoItems(header)} sidebar={mapNavDemoItems(sidebar)} />
}
