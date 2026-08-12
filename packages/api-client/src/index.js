/**
 * @erp/api-client 主入口。
 *
 * 兼容层：保留 createApiClient() 老 API；新代码推荐用：
 *   import { createHttp } from '@erp/api-client/core'
 *   import { createCustomerApi } from '@erp/api-client/domain/customer'
 *
 * 老 API 等价实现：createApiClient({ baseUrl }) = createHttp({ baseUrl }) + 仅暴露 url/health
 */

import { createHttp } from './core/http.js'
import { createCustomerApi } from './domain/customer/auth.js'

export function createApiClient({ baseUrl, request } = {}) {
  const http = createHttp({ baseUrl, fetchImpl: typeof fetch !== 'undefined' ? fetch : null })
  const wrapped = {
    url(path) {
      return http.url(path)
    },
    async health() {
      const result = await http.request('/health', { method: 'GET' })
      return { ok: result.ok, status: result.status, data: result.data }
    }
  }
  // 给老 API 提供 request 注入点（测试场景）
  if (request) {
    wrapped.health = async () => request({ url: http.url('health'), headers: { Accept: 'application/json' } })
  }
  // 暴露新 API 给现有 call site
  wrapped.http = http
  wrapped.customer = createCustomerApi(http)
  return wrapped
}

// 重新导出，方便业务模块一次性 import
export { createHttp } from './core/http.js'
export { createCustomerApi } from './domain/customer/auth.js'