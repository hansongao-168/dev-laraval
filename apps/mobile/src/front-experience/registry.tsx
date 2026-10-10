import {
  asRecords,
  createBlockRegistry,
  stringProp,
  type FrontPageBlock,
} from '@erp/front-experience'
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '@/i18n'

function BannerCarousel({ block }: { block: FrontPageBlock }) {
  const items = asRecords(block.callResult)

  return (
    <View style={styles.section}>
      {items.length === 0 ? (
        <Text style={styles.muted}>{t('banner.empty')}</Text>
      ) : (
        items.map((item, index) => {
          const src = stringProp(item, ['imageUrl', 'image', 'src', 'url'])
          const href = stringProp(item, ['href', 'url', 'link'])
          const caption = stringProp(item, ['title', 'label', 'alt']) || `Banner ${index + 1}`

          return (
            <Pressable
              key={href || src || String(index)}
              style={styles.card}
              onPress={() => {
                if (href) {
                  void Linking.openURL(href)
                }
              }}
            >
              {src ? (
                <Image source={{ uri: src }} style={styles.bannerImage} accessibilityLabel={caption} />
              ) : (
                <Text style={styles.muted}>{caption}</Text>
              )}
            </Pressable>
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
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        {items.length === 0 ? (
          <Text style={styles.muted}>{t('grid.empty')}</Text>
        ) : (
          items.map((item, index) => (
            <View key={stringProp(item, ['id', 'sku', 'slug']) || String(index)} style={styles.tile}>
              <Text style={styles.tileText}>
                {stringProp(item, ['name', 'title', 'label']) || 'Item'}
              </Text>
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
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.muted}>{t('list.empty')}</Text>
      ) : (
        items.map((item, index) => (
          <Text key={stringProp(item, ['id', 'slug']) || String(index)} style={styles.listItem}>
            {stringProp(item, ['title', 'question', 'name', 'label']) || 'Entry'}
          </Text>
        ))
      )}
    </View>
  )
}

function UnknownBlock({ block }: { block: FrontPageBlock }) {
  return (
    <View style={styles.unknown}>
      <Text style={styles.muted}>{block.type}</Text>
    </View>
  )
}

export function createMobileBlockRegistry() {
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

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  muted: {
    color: '#64748b',
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bannerImage: {
    width: '100%',
    height: 160,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '47%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 12,
  },
  tileText: {
    color: '#334155',
    fontSize: 14,
  },
  listItem: {
    color: '#334155',
    fontSize: 14,
    paddingVertical: 4,
  },
  unknown: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    padding: 12,
  },
})
