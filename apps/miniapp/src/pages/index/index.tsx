import { createApiClient } from '@erp/api-client'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
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

  useLoad(() => {
    api
      .health()
      .then(({ ok }) => {
        setStatus(ok ? 'ready' : 'offline')
      })
      .catch(() => {
        setStatus('offline')
      })
  })

  return (
    <View className='page'>
      <View className='brand'>
        <View className='logo'>E</View>
        <View>
          <Text className='brand-name'>ERP GLOBAL</Text>
          <Text className='brand-copy'>全球业务 · 中国就绪</Text>
        </View>
      </View>

      <View className='hero'>
        <Text className='eyebrow'>WECHAT MINI PROGRAM</Text>
        <Text className='title'>让业务随时随地高效运转。</Text>
        <Text className='description'>
          面向中国团队和客户的 ERP 移动入口，与全球平台共享同一套 Laravel API。
        </Text>
      </View>

      <View className='status-card'>
        <View className={`status-dot status-dot--${status}`} />
        <View className='status-content'>
          <Text className='status-title'>
            {status === 'checking'
              ? '正在检查 Laravel API'
              : status === 'ready'
                ? 'Laravel API 已连接'
                : 'Laravel API 暂不可用'}
          </Text>
          <Text className='endpoint'>{apiUrl}</Text>
        </View>
      </View>
    </View>
  )
}
