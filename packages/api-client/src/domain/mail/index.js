/**
 * Mail 子域 API client 工厂(运行时 JS)。
 *
 * 对应 gz168/Mail 的 /api/admin/mail/* 端点(admin_user JWT)。
 * 与 customer 域的 cookie 会话不同,mail 域通过 options.getToken()
 * 提供 JWT,每个请求自动附加 Authorization: Bearer 头。
 */

export function createMailApi(http, { getToken } = {}) {
  function authHeaders() {
    const token = typeof getToken === 'function' ? getToken() : null
    return token ? { Authorization: 'Bearer ' + token } : {}
  }

  async function request(path, options = {}) {
    const result = await http.request(path, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) }
    })
    return result.ok ? result.data : result
  }

  function path(p, query) {
    let s = p
    if (query && Object.keys(query).length) {
      const qs = Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
        .join('&')
      if (qs) s += '?' + qs
    }
    return s
  }

  return {
    // ---- 账户 ----
    async listAccounts(query) {
      return request(path('/api/admin/mail/accounts', query))
    },
    async getAccount(id) {
      return request('/api/admin/mail/accounts/' + id)
    },
    async createAccount(input) {
      return request('/api/admin/mail/accounts', { method: 'POST', body: input })
    },
    async updateAccount(id, input) {
      return request('/api/admin/mail/accounts/' + id, { method: 'PATCH', body: input })
    },
    async deleteAccount(id) {
      return request('/api/admin/mail/accounts/' + id, { method: 'DELETE' })
    },
    async setDefaultAccount(id) {
      return request('/api/admin/mail/accounts/' + id + '/default', { method: 'POST' })
    },
    async getAccountStatus(id) {
      return request('/api/admin/mail/accounts/' + id + '/status')
    },

    // ---- 授权 ----
    async createGmailOAuthUrl(id) {
      return request('/api/admin/mail/accounts/' + id + '/gmail/oauth/url', { method: 'POST' })
    },
    async setQqAuthorizationCode(id, code) {
      return request('/api/admin/mail/accounts/' + id + '/qq/code', {
        method: 'POST',
        body: { code }
      })
    },

    // ---- 同步 ----
    async triggerSync(id) {
      return request('/api/admin/mail/accounts/' + id + '/sync', { method: 'POST' })
    },
    async syncAll() {
      return request('/api/admin/mail/accounts/sync-all', { method: 'POST' })
    },
    async listSyncRuns(accountId, query) {
      return request(path('/api/admin/mail/accounts/' + accountId + '/sync-runs', query))
    },
    async getSyncRun(id) {
      return request('/api/admin/mail/sync-runs/' + id)
    },
    async markSeen(messageId) {
      return request('/api/admin/mail/messages/' + messageId + '/seen', { method: 'POST' })
    },

    // ---- 邮件 ----
    async listMessages(accountId, query) {
      return request(path('/api/admin/mail/accounts/' + accountId + '/messages', query))
    },
    async getMessage(id) {
      return request('/api/admin/mail/messages/' + id)
    },
    async attachmentDownloadUrl(id) {
      return http.url('/api/admin/mail/attachments/' + id + '/download')
    },

    // ---- 发送 ----
    async send(input) {
      return request('/api/admin/mail/send', { method: 'POST', body: input })
    },
    async sendForm(form) {
      // 附件上传:form 为 FormData(含 account_id/to/subject/body/attachments[])
      return request('/api/admin/mail/send', { method: 'POST', body: form })
    },
    async sendTemplate(input) {
      return request('/api/admin/mail/send-template', { method: 'POST', body: input })
    },

    // ---- OTP / 搜索 ----
    async getOtp(id, query) {
      return request(path('/api/admin/mail/accounts/' + id + '/otp', query))
    },

    // ---- Webhook 端点 ----
    async listWebhookEndpoints() {
      return request('/api/admin/mail/webhook-endpoints')
    },
    async createWebhookEndpoint(input) {
      return request('/api/admin/mail/webhook-endpoints', { method: 'POST', body: input })
    },
    async updateWebhookEndpoint(id, input) {
      return request('/api/admin/mail/webhook-endpoints/' + id, { method: 'PATCH', body: input })
    },
    async deleteWebhookEndpoint(id) {
      return request('/api/admin/mail/webhook-endpoints/' + id, { method: 'DELETE' })
    }
  }
}
