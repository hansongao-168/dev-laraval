import { Input, Text, View } from '@tarojs/components'
import Taro, { useLoad, useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { useState } from 'react'
import type { BlockInstance, ResolvedPage } from '@erp/front-experience/core'
import { PageRenderer } from '../../components/front-experience/page-renderer'
import { getFrontPage } from '../../lib/front-experience/client'
import { shareImageForPage } from '../../lib/front-experience/share'
import '../index/index.scss'

function articleListProps (page: ResolvedPage | null): {
  page: number
  hasMore: boolean
} {
  const main = page?.document?.shell?.slots?.main ?? []
  const list = main.find((item) => item.type === 'mall.article-list')
  const current =
    typeof list?.props?.page === 'number'
      ? list.props.page
      : Number.parseInt(String(list?.props?.page ?? '1'), 10) || 1

  return {
    page: current,
    hasMore: Boolean(list?.props?.hasMore),
  }
}

function mergeArticlePage (current: ResolvedPage, incoming: ResolvedPage): ResolvedPage {
  const currentMain = current.document.shell.slots.main ?? []
  const incomingMain = incoming.document.shell.slots.main ?? []
  const currentList = currentMain.find((item) => item.type === 'mall.article-list')
  const incomingList = incomingMain.find((item) => item.type === 'mall.article-list')

  if (!currentList || !incomingList) {
    return incoming
  }

  const existing = Array.isArray(currentList.props?.items) ? currentList.props.items : []
  const next = Array.isArray(incomingList.props?.items) ? incomingList.props.items : []
  const seen = new Set(
    existing
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => String(item.id ?? '')),
  )
  const merged = [...existing]
  for (const item of next) {
    if (typeof item !== 'object' || item === null) {
      continue
    }
    const key = String((item as Record<string, unknown>).id ?? '')
    if (key !== '' && seen.has(key)) {
      continue
    }
    if (key !== '') {
      seen.add(key)
    }
    merged.push(item)
  }

  const nextMain: BlockInstance[] = currentMain.map((block) => {
    if (block.type !== 'mall.article-list') {
      return block
    }
    return {
      ...block,
      props: {
        ...block.props,
        ...incomingList.props,
        items: merged,
      },
    }
  })

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
  }
}

export default function HelpPage () {
  const router = useRouter()
  const [page, setPage] = useState<ResolvedPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState(String(router.params.q ?? ''))
  const [articlePage, setArticlePage] = useState(
    Number.parseInt(String(router.params.page ?? '1'), 10) || 1,
  )
  const [pending, setPending] = useState(false)

  function load (keyword = q, nextPage = articlePage, append = false) {
    setPending(true)
    setError(null)
    getFrontPage({
      slug: 'help',
      channel: 'miniapp',
      q: keyword || undefined,
      page: nextPage > 1 ? nextPage : undefined,
    })
      .then((resolved) => {
        setPage((current) => (append && current ? mergeArticlePage(current, resolved) : resolved))
        setArticlePage(articleListProps(resolved).page)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load help')
      })
      .finally(() => setPending(false))
  }

  useLoad(() => {
    load(String(router.params.q ?? ''), Number.parseInt(String(router.params.page ?? '1'), 10) || 1, false)
  })

  const paging = articleListProps(page)

  useShareAppMessage(() => {
    const query = new URLSearchParams()
    if (q.trim()) {
      query.set('q', q.trim())
    }
    const qs = query.toString()
    const imageUrl = shareImageForPage(page)
    return {
      title: '帮助中心',
      path: `/pages/help/index${qs ? `?${qs}` : ''}`,
      ...(imageUrl ? { imageUrl } : {}),
    }
  })

  useShareTimeline(() => {
    const imageUrl = shareImageForPage(page)
    return {
      title: '帮助中心',
      query: q.trim() ? `q=${encodeURIComponent(q.trim())}` : '',
      ...(imageUrl ? { imageUrl } : {}),
    }
  })

  return (
    <View className='page'>
      <View className='brand'>
        <View className='logo'>E</View>
        <View>
          <Text className='brand-name'>帮助中心</Text>
          <Text className='brand-copy'>Articles · FAQ search</Text>
        </View>
      </View>

      <View className='fe-banners'>
        <Input
          className='fe-banner'
          value={q}
          placeholder='搜索问题或答案'
          onInput={(event) => setQ(String(event.detail.value ?? ''))}
        />
        <View
          className='fe-banner'
          onClick={() => {
            if (pending) {
              return
            }
            load(q.trim(), 1, false)
          }}
        >
          <Text className='fe-banner-title'>{pending ? '搜索中…' : '搜索 FAQ'}</Text>
        </View>
      </View>

      {error ? <Text className='description'>{error}</Text> : null}
      {!page && !error ? <Text className='description'>Loading help…</Text> : null}
      {page ? <PageRenderer page={page} /> : null}

      {page && paging.hasMore ? (
        <View
          className='fe-banner'
          onClick={() => {
            if (pending) {
              return
            }
            load(q.trim(), paging.page + 1, true)
          }}
        >
          <Text className='fe-banner-title'>{pending ? '加载中…' : '加载更多文章'}</Text>
        </View>
      ) : null}

      <View
        className='fe-banner'
        onClick={() => {
          Taro.navigateBack().catch(() => {
            Taro.switchTab({ url: '/pages/index/index' }).catch(() => undefined)
          })
        }}
      >
        <Text className='fe-banner-title'>返回首页</Text>
      </View>
    </View>
  )
}
