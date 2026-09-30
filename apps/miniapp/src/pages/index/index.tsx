import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import type { ResolvedPage } from '@erp/front-experience/core'
import { PageRenderer } from '../../components/front-experience/page-renderer'
import { getFrontPage } from '../../lib/front-experience/client'
import './index.scss'

export default function Index () {
  const [page, setPage] = useState<ResolvedPage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useLoad(() => {
    getFrontPage({ slug: 'home', channel: 'miniapp' })
      .then(setPage)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load page')
      })
  })

  return (
    <View className='page'>
      <View className='brand'>
        <View className='logo'>E</View>
        <View>
          <Text className='brand-name'>ERP GLOBAL</Text>
          <Text className='brand-copy'>Storefront · FrontExperience</Text>
        </View>
      </View>

      {error ? <Text className='description'>{error}</Text> : null}
      {!page && !error ? <Text className='description'>Loading storefront…</Text> : null}
      {page ? <PageRenderer page={page} /> : null}

      <View
        className='fe-banner'
        onClick={() => {
          Taro.navigateTo({ url: '/pages/help/index' }).catch(() => undefined)
        }}
      >
        <Text className='fe-banner-title'>帮助中心</Text>
      </View>
    </View>
  )
}
