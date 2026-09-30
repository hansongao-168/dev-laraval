import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { BlockComponentProps, BlockRegistry } from '@erp/front-experience/core'

function partContent (skin: BlockComponentProps['skin'], partKey?: unknown) {
  if (typeof partKey !== 'string') {
    return null
  }

  const part = skin.parts?.[partKey]?.value as { content?: Record<string, unknown> } | null
  return part?.content ?? part ?? null
}

function asItems (value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
  )
}

function UnknownBlock ({ block }: BlockComponentProps) {
  return (
    <View className='fe-unknown'>
      <Text>Unknown: {block.type}</Text>
    </View>
  )
}

function NavBarBlock ({ block }: BlockComponentProps) {
  return (
    <View className='fe-nav'>
      <Text>Nav ({String(block.props?.navLocation ?? 'header')})</Text>
    </View>
  )
}

function RichTextBlock ({ block, skin }: BlockComponentProps) {
  const partKey = typeof block.props?.partKey === 'string' ? block.props.partKey : ''
  const content = partContent(skin, partKey) as Record<string, unknown> | null
  const text =
    (typeof content?.note === 'string' && content.note) ||
    (typeof content?.message === 'string' && content.message) ||
    (typeof content?.tagline === 'string' && content.tagline) ||
    partKey

  return (
    <View className='fe-rich'>
      <Text>{text}</Text>
    </View>
  )
}

function BannerCarouselBlock ({ block, skin }: BlockComponentProps) {
  const content = partContent(skin, block.props?.partKey) as Record<string, unknown> | null
  const items = asItems(block.props?.items ?? content?.items)

  return (
    <View className='fe-banners'>
      {items.map((item, index) => {
        const title = String(item.title ?? 'Banner')
        const href = typeof item.href === 'string' && item.href !== '' ? item.href : null
        const imageUrl =
          typeof item.imageUrl === 'string' && item.imageUrl !== ''
            ? item.imageUrl
            : typeof item.image_url === 'string' && item.image_url !== ''
              ? item.image_url
              : null

        const open = () => {
          if (!href) {
            return
          }
          if (href.startsWith('http://') || href.startsWith('https://')) {
            Taro.setClipboardData({ data: href }).catch(() => undefined)
            return
          }
          Taro.navigateTo({ url: href }).catch(() => undefined)
        }

        return (
          <View key={index} className='fe-banner' onClick={open}>
            {imageUrl ? (
              <Image className='fe-banner-image' src={imageUrl} mode='aspectFill' />
            ) : null}
            <Text className='fe-banner-title'>{title}</Text>
            {item.subtitle ? <Text className='fe-banner-sub'>{String(item.subtitle)}</Text> : null}
          </View>
        )
      })}
    </View>
  )
}

function ProductGridBlock ({ block, skin }: BlockComponentProps) {
  const content = partContent(skin, block.props?.partKey) as Record<string, unknown> | null
  const title =
    (typeof block.props?.title === 'string' && block.props.title) ||
    (typeof content?.title === 'string' && content.title) ||
    'Hot'
  const items = asItems(block.props?.items ?? content?.items).slice(0, Number(block.props?.limit ?? 8))

  return (
    <View className='fe-grid'>
      <Text className='fe-grid-title'>{title}</Text>
      {items.map((item, index) => (
        <View key={String(item.sku ?? index)} className='fe-product'>
          <Text>{String(item.name ?? 'Product')}</Text>
          <Text>{String(item.price ?? '')}</Text>
        </View>
      ))}
    </View>
  )
}

function CategoryNavBlock ({ block, skin }: BlockComponentProps) {
  const content = partContent(skin, block.props?.partKey) as Record<string, unknown> | null
  const items = asItems(block.props?.items ?? content?.items)

  return (
    <View className='fe-cats'>
      {items.map((item, index) => (
        <Text key={index} className='fe-cat'>
          {String(item.label ?? 'Category')}
        </Text>
      ))}
    </View>
  )
}

function ArticleListBlock ({ block }: BlockComponentProps) {
  const title = typeof block.props?.title === 'string' ? block.props.title : '帮助文章'
  const items = asItems(block.props?.items)

  return (
    <View className='fe-articles'>
      <Text className='fe-section-title'>{title}</Text>
      {items.map((item, index) => (
        <View
          key={String(item.id ?? index)}
          className='fe-article'
          onClick={() => {
            if (item.id == null) {
              return
            }
            Taro.navigateTo({ url: `/pages/article/index?id=${String(item.id)}` }).catch(() => undefined)
          }}
        >
          <Text className='fe-article-title'>{String(item.title ?? 'Article')}</Text>
          {item.excerpt ? <Text className='fe-article-excerpt'>{String(item.excerpt)}</Text> : null}
        </View>
      ))}
    </View>
  )
}

function ArticleDetailBlock ({ block }: BlockComponentProps) {
  const article =
    block.props?.article && typeof block.props.article === 'object'
      ? (block.props.article as Record<string, unknown>)
      : null

  if (!article) {
    return (
      <View className='fe-article-empty'>
        <Text>文章不存在或未发布</Text>
      </View>
    )
  }

  return (
    <View className='fe-article-detail'>
      <Text className='fe-article-title'>{String(article.title ?? '')}</Text>
      <Text className='fe-article-excerpt'>{String(article.content ?? '')}</Text>
    </View>
  )
}

function FaqListBlock ({ block }: BlockComponentProps) {
  const title = typeof block.props?.title === 'string' ? block.props.title : '常见问题'
  const items = asItems(block.props?.items)

  return (
    <View className='fe-faqs'>
      <Text className='fe-section-title'>{title}</Text>
      {items.map((item, index) => (
        <View key={String(item.id ?? index)} className='fe-faq'>
          <Text className='fe-faq-q'>{String(item.question ?? 'Question')}</Text>
          {item.answer ? <Text className='fe-faq-a'>{String(item.answer)}</Text> : null}
        </View>
      ))}
    </View>
  )
}

function FaqSearchBlock ({ block }: BlockComponentProps) {
  return <FaqListBlock block={block} />
}

export const miniappBlockRegistry: BlockRegistry = {
  'shell.nav-bar': NavBarBlock,
  'content.rich-text': RichTextBlock,
  'shell.unknown-block': UnknownBlock,
  'shell.announcement': ({ block }: BlockComponentProps) => (
    <View className='fe-announce'>
      <Text>{String(block.props?.text ?? '')}</Text>
    </View>
  ),
  'mall.banner-carousel': BannerCarouselBlock,
  'mall.product-grid': ProductGridBlock,
  'mall.category-nav': CategoryNavBlock,
  'mall.article-list': ArticleListBlock,
  'mall.article-detail': ArticleDetailBlock,
  'mall.faq-list': FaqListBlock,
  'mall.faq-search': FaqSearchBlock,
}
