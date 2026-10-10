import { ListFrame } from '@erp/ui'
import { t } from '../i18n'

export function ProductsView() {
  return (
    <ListFrame title={t('products.title')} description={t('products.description')}>
      <p className="text-sm text-slate-500">{t('products.empty')}</p>
    </ListFrame>
  )
}
