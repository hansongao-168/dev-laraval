import { createApiClient } from '@erp/api-client'
import type { FrontPageBlock } from '@erp/front-experience'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PageRenderer } from '@/front-experience/page-renderer'
import { t } from '@/i18n'
import { getFrontPageSafe, mainBlocks } from '@/lib/front-page'

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api/v1'
const api = createApiClient({ baseUrl: apiUrl })

export default function HomeScreen() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'offline'>('checking')
  const [blocks, setBlocks] = useState<FrontPageBlock[]>([])

  useEffect(() => {
    let cancelled = false

    Promise.all([api.health(), getFrontPageSafe('home')])
      .then(([health, document]) => {
        if (cancelled) {
          return
        }
        setStatus(health.ok ? 'ready' : 'offline')
        setBlocks(mainBlocks(document))
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('offline')
          setBlocks([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>E</Text>
          </View>
          <View>
            <Text style={styles.eyebrow}>ERP GLOBAL</Text>
            <Text style={styles.brandCopy}>{t('home.brandCopy')}</Text>
          </View>
        </View>

        {blocks.length > 0 ? (
          <PageRenderer blocks={blocks} />
        ) : (
          <View style={styles.hero}>
            <Text style={styles.title}>{t('home.title')}</Text>
            <Text style={styles.description}>{t('home.description')}</Text>
          </View>
        )}

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {status === 'checking' ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <View
                style={[styles.statusDot, status === 'ready' ? styles.ready : styles.offline]}
              />
            )}
            <Text style={styles.statusTitle}>
              {status === 'checking'
                ? t('home.status.checking')
                : status === 'ready'
                  ? t('home.status.ready')
                  : t('home.status.offline')}
            </Text>
          </View>
          <Text style={styles.endpoint}>{apiUrl}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 32,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  eyebrow: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  brandCopy: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  hero: {
    gap: 18,
  },
  title: {
    color: '#0f172a',
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  description: {
    color: '#64748b',
    fontSize: 17,
    lineHeight: 26,
  },
  statusCard: {
    gap: 12,
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusHeader: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ready: {
    backgroundColor: '#22c55e',
  },
  offline: {
    backgroundColor: '#f97316',
  },
  statusTitle: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '700',
  },
  endpoint: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'monospace',
  },
})
