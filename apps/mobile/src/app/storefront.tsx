import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ResolvedPage } from '@erp/front-experience/core';
import { PageRenderer } from '@/components/front-experience/page-renderer';
import { getFrontPage } from '@/lib/front-experience/client';

export default function StorefrontScreen() {
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
        <Text style={styles.kicker}>ERP GLOBAL</Text>
        <Text style={styles.title}>首页</Text>
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
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#0f766e',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  error: { color: '#be123c' },
});
