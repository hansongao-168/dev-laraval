import { Text, View } from '@tarojs/components'
import Taro, { useLoad, useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { useState } from 'react'
import type { ResolvedPage } from '@erp/front-experience/core'
import { PageRenderer } from '../../components/front-experience/page-renderer'
import { getFrontPage } from '../../lib/front-experience/client'
import { shareImageForPage } from '../../lib/front-experience/share'
import '../index/index.scss'

function articleTitle (page: ResolvedPage | null): string {
  const main = page?.document?.shell?.slots?.main ?? []
  const detail = main.find((item) => item.type === 'mall.article-detail')
  const article = detail?.props?.article
  if (article && typeof article === 'object' && 'title' in article) {
    const title = (article as { title?: unknown }).title
    if (typeof title === 'string' && title !== '') {
      return title
    }
  }
  return '帮助文章'
}

export default function ArticlePage () {
  const router = useRouter()
  const [page, setPage] = useState<ResolvedPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const id = router.params.id

  useLoad(() => {
    if (!id) {
      setError('Missing article id')
      return
    }

    getFrontPage({ slug: 'article', channel: 'miniapp', id })
      .then(setPage)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load article')
      })
  })

  useShareAppMessage(() => {
    const imageUrl = shareImageForPage(page)
    return {
      title: articleTitle(page),
      path: id ? `/pages/article/index?id=${id}` : '/pages/help/index',
      ...(imageUrl ? { imageUrl } : {}),
    }
  })

  useShareTimeline(() => {
    const imageUrl = shareImageForPage(page)
    return {
      title: articleTitle(page),
      query: id ? `id=${id}` : '',
      ...(imageUrl ? { imageUrl } : {}),
    }
  })

  return (
    <View className='page'>
      <View className='brand'>
        <View className='logo'>E</View>
        <View>
          <Text className='brand-name'>文章详情</Text>
          <Text className='brand-copy'>MallContent article</Text>
        </View>
      </View>

      {error ? <Text className='description'>{error}</Text> : null}
      {!page && !error ? <Text className='description'>Loading article…</Text> : null}
      {page ? <PageRenderer page={page} /> : null}

      <View
        className='fe-banner'
        onClick={() => {
          Taro.navigateTo({ url: '/pages/help/index' }).catch(() => undefined)
        }}
      >
        <Text className='fe-banner-title'>返回帮助中心</Text>
      </View>
    </View>
  )
}
