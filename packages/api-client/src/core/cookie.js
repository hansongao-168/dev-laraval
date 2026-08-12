/**
 * 浏览器端 cookie 读取工具（Sanctum SPA 模式）。
 *
 * Laravel 默认 Set-Cookie XSRF-TOKEN=<urlencoded>; 读取时需 decodeURIComponent。
 */

export function readCookie(name) {
  if (typeof document === 'undefined') return null
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp('(?:^|; )' + escaped + '=([^;]*)').exec(document.cookie)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch (_err) {
    return match[1]
  }
}