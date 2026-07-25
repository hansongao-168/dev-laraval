import { createApiClient } from '@erp/api-client';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api/v1';
const api = createApiClient({ baseUrl: apiUrl });

export default function HomeScreen() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'offline'>(
    'checking'
  );

  useEffect(() => {
    api
      .health()
      .then((response) => {
        setStatus(response.ok ? 'ready' : 'offline');
      })
      .catch(() => {
        setStatus('offline');
      });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>E</Text>
          </View>
          <View>
            <Text style={styles.eyebrow}>ERP GLOBAL</Text>
            <Text style={styles.brandCopy}>Global first · China ready</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>Your business, wherever work happens.</Text>
          <Text style={styles.description}>
            The native ERP experience for teams operating across regions,
            currencies, and time zones.
          </Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {status === 'checking' ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <View
                style={[
                  styles.statusDot,
                  status === 'ready' ? styles.ready : styles.offline,
                ]}
              />
            )}
            <Text style={styles.statusTitle}>
              {status === 'checking'
                ? 'Checking Laravel API'
                : status === 'ready'
                  ? 'Laravel API connected'
                  : 'Laravel API unavailable'}
            </Text>
          </View>
          <Text style={styles.endpoint}>{apiUrl}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 48,
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
    flex: 1,
    justifyContent: 'center',
    gap: 18,
  },
  title: {
    color: '#0f172a',
    fontSize: 44,
    lineHeight: 50,
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
});
