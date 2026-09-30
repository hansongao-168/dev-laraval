import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { BlockComponentProps, BlockRegistry } from '@erp/front-experience/core';

function partContent(skin: BlockComponentProps['skin'], partKey?: unknown) {
  if (typeof partKey !== 'string') {
    return null;
  }

  const part = skin.parts?.[partKey]?.value as { content?: Record<string, unknown> } | null;
  return part?.content ?? part ?? null;
}

function asItems(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
  );
}

function UnknownBlock({ block }: BlockComponentProps) {
  return (
    <View style={styles.unknown}>
      <Text>Unknown: {block.type}</Text>
    </View>
  );
}

function NavBarBlock({ block }: BlockComponentProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.strong}>Nav</Text>
      <Text> location={String(block.props?.navLocation ?? 'header')}</Text>
    </View>
  );
}

function RichTextBlock({ block, skin }: BlockComponentProps) {
  const partKey = typeof block.props?.partKey === 'string' ? block.props.partKey : '';
  const content = partContent(skin, partKey) as Record<string, unknown> | null;
  const text =
    (typeof content?.note === 'string' && content.note) ||
    (typeof content?.message === 'string' && content.message) ||
    (typeof content?.tagline === 'string' && content.tagline) ||
    partKey;

  return (
    <View style={styles.card}>
      <Text>{text}</Text>
    </View>
  );
}

function BannerCarouselBlock({ block, skin }: BlockComponentProps) {
  const content = partContent(skin, block.props?.partKey) as Record<string, unknown> | null;
  const items = asItems(block.props?.items ?? content?.items);

  return (
    <View style={styles.bannerList}>
      {items.map((item, index) => {
        const title = String(item.title ?? 'Banner');
        const href = typeof item.href === 'string' && item.href !== '' ? item.href : null;
        const imageUrl =
          typeof item.imageUrl === 'string' && item.imageUrl !== ''
            ? item.imageUrl
            : typeof item.image_url === 'string' && item.image_url !== ''
              ? item.image_url
              : null;

        const body = (
          <>
            {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.bannerImage} /> : null}
            <View style={imageUrl ? styles.bannerCopyWithImage : styles.bannerCopy}>
              <Text style={styles.bannerTitle}>{title}</Text>
              {item.subtitle ? <Text style={styles.bannerSub}>{String(item.subtitle)}</Text> : null}
            </View>
          </>
        );

        if (href) {
          return (
            <Pressable
              key={index}
              style={styles.banner}
              onPress={() => {
                if (href.startsWith('http://') || href.startsWith('https://')) {
                  void Linking.openURL(href).catch(() => undefined);
                }
              }}
            >
              {body}
            </Pressable>
          );
        }

        return (
          <View key={index} style={styles.banner}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

function ProductGridBlock({ block, skin }: BlockComponentProps) {
  const content = partContent(skin, block.props?.partKey) as Record<string, unknown> | null;
  const title =
    (typeof block.props?.title === 'string' && block.props.title) ||
    (typeof content?.title === 'string' && content.title) ||
    'Hot';
  const items = asItems(block.props?.items ?? content?.items).slice(
    0,
    Number(block.props?.limit ?? 8),
  );

  return (
    <View style={styles.section}>
      <Text style={styles.strong}>{title}</Text>
      <View style={styles.grid}>
        {items.map((item, index) => (
          <View key={String(item.sku ?? index)} style={styles.product}>
            <Text style={styles.strong}>{String(item.name ?? 'Product')}</Text>
            <Text style={styles.price}>{String(item.price ?? '')}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CategoryNavBlock({ block, skin }: BlockComponentProps) {
  const content = partContent(skin, block.props?.partKey) as Record<string, unknown> | null;
  const items = asItems(block.props?.items ?? content?.items);

  return (
    <View style={styles.cats}>
      {items.map((item, index) => (
        <View key={index} style={styles.cat}>
          <Text>{String(item.label ?? 'Category')}</Text>
        </View>
      ))}
    </View>
  );
}

function ArticleListBlock({ block }: BlockComponentProps) {
  const router = useRouter();
  const title = typeof block.props?.title === 'string' ? block.props.title : '帮助文章';
  const items = asItems(block.props?.items);

  return (
    <View style={styles.section}>
      <Text style={styles.strong}>{title}</Text>
      {items.map((item, index) => (
        <Pressable
          key={String(item.id ?? index)}
          style={styles.card}
          onPress={() => {
            if (item.id == null) {
              return;
            }
            router.push(`/article?id=${String(item.id)}`);
          }}
        >
          <Text style={styles.strong}>{String(item.title ?? 'Article')}</Text>
          {item.excerpt ? <Text>{String(item.excerpt)}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

function ArticleDetailBlock({ block }: BlockComponentProps) {
  const article =
    block.props?.article && typeof block.props.article === 'object'
      ? (block.props.article as Record<string, unknown>)
      : null;

  if (!article) {
    return (
      <View style={styles.card}>
        <Text>文章不存在或未发布</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.strong}>{String(article.title ?? '')}</Text>
      <Text>{String(article.content ?? '')}</Text>
    </View>
  );
}

function FaqListBlock({ block }: BlockComponentProps) {
  const title = typeof block.props?.title === 'string' ? block.props.title : '常见问题';
  const items = asItems(block.props?.items);

  return (
    <View style={styles.section}>
      <Text style={styles.strong}>{title}</Text>
      {items.map((item, index) => (
        <View key={String(item.id ?? index)} style={styles.card}>
          <Text style={styles.strong}>{String(item.question ?? 'Question')}</Text>
          {item.answer ? <Text>{String(item.answer)}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function FaqSearchBlock({ block }: BlockComponentProps) {
  return <FaqListBlock block={block} />;
}

export const mobileBlockRegistry: BlockRegistry = {
  'shell.nav-bar': NavBarBlock,
  'content.rich-text': RichTextBlock,
  'shell.unknown-block': UnknownBlock,
  'shell.announcement': ({ block }: BlockComponentProps) => (
    <View style={styles.announce}>
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
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  unknown: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff1f2',
  },
  announce: {
    backgroundColor: '#fffbeb',
    padding: 10,
  },
  strong: {
    fontWeight: '600',
  },
  bannerList: {
    gap: 8,
  },
  banner: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: 140,
  },
  bannerCopy: {
    padding: 16,
  },
  bannerCopyWithImage: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  section: {
    gap: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  product: {
    width: '47%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  price: {
    marginTop: 4,
    color: '#0f766e',
  },
  cats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cat: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
});
