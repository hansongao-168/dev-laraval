import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { ResolvedPage } from '@erp/front-experience/core';
import { PageRenderer } from '@/components/front-experience/page-renderer';
import { getFrontPage } from '@/lib/front-experience/client';

export default function StorefrontScreen() {
  const router = useRouter();
  const [page, setPage] = useState<ResolvedPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFrontPage({ slug: 'home', channel: 'mobile' })
      .then(setPage)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load page');
      });
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Storefront</Text>
        <Text style={styles.copy}>FrontPage home via @erp/front-experience</Text>
        <Pressable onPress={() => router.push('/help')}>
          <Text style={styles.link}>Help center →</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!page && !error ? <ActivityIndicator color="#0f766e" /> : null}
        {page ? <PageRenderer page={page} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  copy: { fontSize: 13, color: '#64748b' },
  link: { color: '#0f766e', fontWeight: '600' },
  error: { color: '#be123c' },
});
