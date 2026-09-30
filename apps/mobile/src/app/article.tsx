import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ResolvedPage } from '@erp/front-experience/core';
import { PageRenderer } from '@/components/front-experience/page-renderer';
import { getFrontPage } from '@/lib/front-experience/client';
import { shareImageForPage } from '@/lib/front-experience/share';

function articleTitle(page: ResolvedPage | null): string {
  const main = page?.document?.shell?.slots?.main ?? [];
  const detail = main.find((item) => item.type === 'mall.article-detail');
  const article = detail?.props?.article;
  if (article && typeof article === 'object' && 'title' in article) {
    const title = (article as { title?: unknown }).title;
    if (typeof title === 'string' && title !== '') {
      return title;
    }
  }
  return '帮助文章';
}

export default function ArticleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [page, setPage] = useState<ResolvedPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params.id;
    if (!id) {
      setError('Missing article id');
      return;
    }

    getFrontPage({ slug: 'article', channel: 'mobile', id })
      .then(setPage)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load article');
      });
  }, [params.id]);

  const title = articleTitle(page);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>文章详情</Text>
        <Text style={styles.copy}>MallContent article via FrontPage</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!page && !error ? <ActivityIndicator color="#0f766e" /> : null}
        {page ? <PageRenderer page={page} /> : null}
        <Pressable
          onPress={() => {
            const imageUrl = shareImageForPage(page);
            void Share.share({
              title,
              message: imageUrl ? `${title}\n${imageUrl}` : title,
              url: imageUrl,
            });
          }}
        >
          <Text style={styles.link}>分享</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/help')}>
          <Text style={styles.link}>← Help</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  copy: { fontSize: 13, color: '#64748b' },
  error: { color: '#be123c' },
  link: { marginTop: 8, color: '#0f766e', fontWeight: '600' },
});
