import {
  asRecords,
  createBlockRegistry,
  stringProp,
  type FrontPageBlock,
} from '@erp/front-experience'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { t } from '../i18n'

function BannerCarousel({ block }: { block: FrontPageBlock }) {
  const items = asRecords(block.callResult)

  return (
    <View className='fe-section'>
      {items.length === 0 ? (
        <Text className='fe-muted'>{t('banner.empty')}</Text>
      ) : (
        items.map((item, index) => {
          const src = stringProp(item, ['imageUrl', 'image', 'src', 'url'])
          const href = stringProp(item, ['href', 'url', 'link'])
          const caption = stringProp(item, ['title', 'label', 'alt']) || `Banner ${index + 1}`

          return (
            <View
              key={href || src || String(index)}
              className='fe-card'
              onClick={() => {
                if (href) {
                  void Taro.navigateTo({ url: href }).catch(() => {
                    void Taro.setClipboardData({ data: href })
                  })
                }
              }}
            >
              {src ? (
                <Image src={src} className='fe-banner' mode='aspectFill' />
              ) : (
                <Text className='fe-muted'>{caption}</Text>
              )}
            </View>
          )
        })
      )}
    </View>
  )
}

function GridBlock({ block }: { block: FrontPageBlock }) {
  const items = asRecords(block.callResult)
  const title = typeof block.props?.title === 'string' ? block.props.title : block.type

  return (
    <View className='fe-section'>
      <Text className='fe-title'>{title}</Text>
      <View className='fe-grid'>
        {items.length === 0 ? (
          <Text className='fe-muted'>{t('grid.empty')}</Text>
        ) : (
          items.map((item, index) => (
            <View key={stringProp(item, ['id', 'sku', 'slug']) || String(index)} className='fe-tile'>
              <Text>{stringProp(item, ['name', 'title', 'label']) || 'Item'}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  )
}

function ListBlock({ block }: { block: FrontPageBlock }) {
  const items = asRecords(block.callResult)
  const title = typeof block.props?.title === 'string' ? block.props.title : block.type

  return (
    <View className='fe-section'>
      <Text className='fe-title'>{title}</Text>
      {items.length === 0 ? (
        <Text className='fe-muted'>{t('list.empty')}</Text>
      ) : (
        items.map((item, index) => (
          <Text key={stringProp(item, ['id', 'slug']) || String(index)} className='fe-list-item'>
            {stringProp(item, ['title', 'question', 'name', 'label']) || 'Entry'}
          </Text>
        ))
      )}
    </View>
  )
}

function UnknownBlock({ block }: { block: FrontPageBlock }) {
  return (
    <View className='fe-unknown'>
      <Text className='fe-muted'>{block.type}</Text>
    </View>
  )
}

export function createMiniappBlockRegistry() {
  const registry = createBlockRegistry()
  registry.register('mall.banner-carousel', ({ block }) => <BannerCarousel block={block} />)
  registry.register('mall.product-grid', ({ block }) => <GridBlock block={block} />)
  registry.register('mall.category-nav', ({ block }) => <GridBlock block={block} />)
  registry.register('mall.article-list', ({ block }) => <ListBlock block={block} />)
  registry.register('mall.faq-list', ({ block }) => <ListBlock block={block} />)

  return registry
}

export function renderUnknownBlock(block: FrontPageBlock) {
  return <UnknownBlock block={block} />
}
