import { asRecords, stringProp } from '../block-utils'
import { t } from '../i18n'
import type { FrontPageBlock } from '../types'

function BannerCarousel({ block }: { block: FrontPageBlock }) {
  const items = asRecords(block.callResult)

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <div className="grid gap-2 p-4 sm:grid-cols-2">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">{t('banner.empty')}</p>
        ) : (
          items.map((item, index) => {
            const src = stringProp(item, ['imageUrl', 'image', 'src', 'url'])
            const href = stringProp(item, ['href', 'url', 'link'])
            const caption = stringProp(item, ['title', 'label', 'alt']) || `Banner ${index + 1}`

            return (
              <a key={href || src || String(index)} href={href || '#'} className="block overflow-hidden rounded-xl bg-white">
                {src ? (
                  <img src={src} alt={caption} className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-slate-500">{caption}</div>
                )}
              </a>
            )
          })
        )}
      </div>
    </section>
  )
}

function GridBlock({ block }: { block: FrontPageBlock }) {
  const items = asRecords(block.callResult)
  const title = typeof block.props?.title === 'string' ? block.props.title : block.type

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-slate-900">{title}</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.length === 0 ? (
          <p className="col-span-full text-sm text-slate-500">{t('grid.empty')}</p>
        ) : (
          items.map((item, index) => (
            <article
              key={stringProp(item, ['id', 'sku', 'slug']) || String(index)}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
            >
              {stringProp(item, ['name', 'title', 'label']) || 'Item'}
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function ListBlock({ block }: { block: FrontPageBlock }) {
  const items = asRecords(block.callResult)
  const title = typeof block.props?.title === 'string' ? block.props.title : block.type

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-slate-900">{title}</h2>
      <ul className="space-y-2 text-sm text-slate-700">
        {items.length === 0 ? (
          <li className="text-slate-500">{t('list.empty')}</li>
        ) : (
          items.map((item, index) => (
            <li key={stringProp(item, ['id', 'slug']) || String(index)}>
              {stringProp(item, ['title', 'question', 'name', 'label']) || 'Entry'}
            </li>
          ))
        )}
      </ul>
    </section>
  )
}

export const mallBlockRenderers = {
  'mall.banner-carousel': BannerCarousel,
  'mall.product-grid': GridBlock,
  'mall.category-nav': GridBlock,
  'mall.article-list': ListBlock,
  'mall.faq-list': ListBlock,
} as const
