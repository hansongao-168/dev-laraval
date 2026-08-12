import { readCookie } from './cookie.js'

/**
 * CSRF 协调器 — 自动取 /sanctum/csrf-cookie 并注入 X-XSRF-TOKEN 头。
 *
 * - ensureCsrfCookie(baseUrl): 浏览器第一次写请求前调用一次；成功后浏览器 cookie 已有 XSRF-TOKEN
 * - csrfHeaders(): 返回 { 'X-XSRF-TOKEN': decodeURIComponent(cookie) } 或空对象
 *
 * 注意：浏览器环境运行；SSR (Node) 不调用本模块。
 */

let csrfPromise = null

export function ensureCsrfCookie(baseUrl) {
  if (typeof window === 'undefined') return Promise.resolve()
  if (csrfPromise) return csrfPromise

  csrfPromise = fetch(baseUrl.replace(/\/+$/, '') + '/sanctum/csrf-cookie', {
    method: 'GET',
    credentials: 'include'
  })
    .catch(() => null)
    .finally(() => {
      // 让下一次请求重新尝试
      setTimeout(() => { csrfPromise = null }, 0)
    })

  return csrfPromise
}

export function csrfHeaders() {
  const token = readCookie('XSRF-TOKEN')
  if (!token) return {}
  return { 'X-XSRF-TOKEN': token }
}