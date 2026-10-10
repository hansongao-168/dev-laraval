import { createApiClient } from '@erp/api-client'
import type { FrontPageBlock } from '@erp/front-experience'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { PageRenderer } from '../../front-experience/page-renderer'
import { t } from '../../i18n'
import { getFrontPageSafe, mainBlocks } from '../../lib/front-page'
import './index.scss'

const apiUrl = process.env.TARO_APP_API_URL ?? 'http://localhost/api/v1'
const api = createApiClient({
  baseUrl: apiUrl,
  request: async ({ url, headers }) => {
    const response = await Taro.request({ url, header: headers })

    return {
      ok: response.statusCode >= 200 && response.statusCode < 300,
      status: response.statusCode,
      data: response.data
    }
  }
})

export default function Index () {
  const [status, setStatus] = useState<'checking' | 'ready' | 'offline'>('checking')
  const [blocks, setBlocks] = useState<FrontPageBlock[]>([])

  useLoad(() => {
    Promise.all([api.health(), getFrontPageSafe('home')])
      .then(([health, document]) => {
        setStatus(health.ok ? 'ready' : 'offline')
        setBlocks(mainBlocks(document))
      })
      .catch(() => {
        setStatus('offline')
        setBlocks([])
      })
  })

  return (
    <View className='page'>
      <View className='brand'>
        <View className='logo'>E</View>
        <View>
          <Text className='brand-name'>ERP GLOBAL</Text>
          <Text className='brand-copy'>{t('home.brandCopy')}</Text>
        </View>
      </View>

      {blocks.length > 0 ? (
        <PageRenderer blocks={blocks} />
      ) : (
        <View className='hero'>
          <Text className='eyebrow'>{t('home.eyebrow')}</Text>
          <Text className='title'>{t('home.title')}</Text>
          <Text className='description'>{t('home.description')}</Text>
        </View>
      )}

      <View className='status-card'>
        <View className={`status-dot status-dot--${status}`} />
        <View className='status-content'>
          <Text className='status-title'>
            {status === 'checking'
              ? t('home.status.checking')
              : status === 'ready'
                ? t('home.status.ready')
                : t('home.status.offline')}
          </Text>
          <Text className='endpoint'>{apiUrl}</Text>
        </View>
      </View>
    </View>
  )
}
