import Taro from '@tarojs/taro'
import { normalizeSeoLocale, resolvePageShareImage } from '@erp/front-experience/core'
import type { ResolvedPage } from '@erp/front-experience/core'

/** Origin for absolute brand asset URLs in share cards. */
export const API_ORIGIN = (process.env.TARO_APP_API_URL ?? 'http://localhost').replace(
  /\/api\/v1\/?$/,
  '',
)

export function clientLocale (): string {
  try {
    const language = Taro.getSystemInfoSync()?.language
    return normalizeSeoLocale(typeof language === 'string' ? language : null)
  } catch {
    return 'zh_CN'
  }
}

export function shareImageForPage (
  page: ResolvedPage | null | undefined,
  locale?: string,
): string | undefined {
  if (!page) {
    return undefined
  }

  return resolvePageShareImage(page, locale ?? clientLocale(), API_ORIGIN)
}
