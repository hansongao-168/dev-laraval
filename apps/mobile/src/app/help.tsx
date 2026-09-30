import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BlockInstance, ResolvedPage } from '@erp/front-experience/core';
import { PageRenderer } from '@/components/front-experience/page-renderer';
import { getFrontPage } from '@/lib/front-experience/client';
import { shareImageForPage } from '@/lib/front-experience/share';

function articleListProps(page: ResolvedPage | null): { page: number; hasMore: boolean } {
  const main = page?.document?.shell?.slots?.main ?? [];
  const list = main.find((item) => item.type === 'mall.article-list');
  const current =
    typeof list?.props?.page === 'number'
      ? list.props.page
      : Number.parseInt(String(list?.props?.page ?? '1'), 10) || 1;

  return {
    page: current,
    hasMore: Boolean(list?.props?.hasMore),
  };
}

function mergeArticlePage(current: ResolvedPage, incoming: ResolvedPage): ResolvedPage {
  const currentMain = current.document.shell.slots.main ?? [];
  const incomingMain = incoming.document.shell.slots.main ?? [];
  const currentList = currentMain.find((item) => item.type === 'mall.article-list');
  const incomingList = incomingMain.find((item) => item.type === 'mall.article-list');

  if (!currentList || !incomingList) {
    return incoming;
  }

  const existing = Array.isArray(currentList.props?.items) ? currentList.props.items : [];
  const next = Array.isArray(incomingList.props?.items) ? incomingList.props.items : [];
  const seen = new Set(
    existing
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => String(item.id ?? '')),
  );
  const merged = [...existing];
  for (const item of next) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const key = String((item as Record<string, unknown>).id ?? '');
    if (key !== '' && seen.has(key)) {
      continue;
    }
    if (key !== '') {
      seen.add(key);
    }
    merged.push(item);
  }

  const nextMain: BlockInstance[] = currentMain.map((block) => {
    if (block.type !== 'mall.article-list') {
      return block;
    }
    return {
      ...block,
      props: {
        ...block.props,
        ...incomingList.props,
        items: merged,
      },
    };
  });

  return {
    ...incoming,
    document: {
      ...incoming.document,
      shell: {
        ...incoming.document.shell,
        slots: {
          ...incoming.document.shell.slots,
          main: nextMain,
        },
      },
    },
  };
}

export default function HelpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; page?: string }>();
  const [q, setQ] = useState(String(params.q ?? ''));
  const [articlePage, setArticlePage] = useState(
    Number.parseInt(String(params.page ?? '1'), 10) || 1,
  );
  const [page, setPage] = useState<ResolvedPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback((keyword = q, nextPage = articlePage, append = false) => {
    setPending(true);
    setError(null);
    getFrontPage({
      slug: 'help',
      channel: 'mobile',
      q: keyword || undefined,
      page: nextPage > 1 ? nextPage : undefined,
    })
      .then((resolved) => {
        setPage((current) => (append && current ? mergeArticlePage(current, resolved) : resolved));
        setArticlePage(articleListProps(resolved).page);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load help');
      })
      .finally(() => setPending(false));
  }, [articlePage, q]);

  useEffect(() => {
    load(String(params.q ?? ''), Number.parseInt(String(params.page ?? '1'), 10) || 1, false);
    // Initial route params only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paging = articleListProps(page);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>帮助中心</Text>
        <Text style={styles.copy}>Articles · infinite scroll</Text>

        <View style={styles.searchRow}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="搜索问题或答案"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={styles.button}
            onPress={() => {
              if (!pending) {
                load(q.trim(), 1, false);
              }
            }}
          >
            <Text style={styles.buttonText}>{pending ? '…' : '搜索'}</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!page && !error ? <ActivityIndicator color="#0f766e" /> : null}
        {page ? <PageRenderer page={page} /> : null}

        {page && paging.hasMore ? (
          <Pressable
            style={styles.button}
            onPress={() => {
              if (!pending) {
                load(q.trim(), paging.page + 1, true);
              }
            }}
          >
            <Text style={styles.buttonText}>{pending ? '…' : '加载更多文章'}</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => {
            const imageUrl = shareImageForPage(page);
            void Share.share({
              title: '帮助中心',
              message: imageUrl
                ? `帮助中心 · Articles & FAQ\n${imageUrl}`
                : '帮助中心 · Articles & FAQ',
              url: imageUrl,
            });
          }}
        >
          <Text style={styles.link}>分享</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/storefront')}>
          <Text style={styles.link}>← Storefront</Text>
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
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#be123c' },
  link: { marginTop: 8, color: '#0f766e', fontWeight: '600' },
});
