/**
 * Customer 子域 API client 工厂（运行时 JS）。
 *
 * 接收由 core/http.createHttp() 返回的 HttpClient，
 * 返回 Customer 子域全部端点的方法。
 *
 * 与 gz168/Customer 的 controller 端点一一对应。
 */

export function createCustomerApi(http) {
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
    // 公开
    async register(input) {
      return (await http.request('/api/v1/auth/register', { method: 'POST', body: input })).data
    },
    async login(input) {
      return (await http.request('/api/v1/auth/login', { method: 'POST', body: input })).data
    },
    async forgotPassword(input) {
      return (await http.request('/api/v1/auth/password/forgot', { method: 'POST', body: input })).data
    },
    async resetPassword(input) {
      return (await http.request('/api/v1/auth/password/reset', { method: 'POST', body: input })).data
    },
    async wxLogin(input) {
      return (await http.request('/api/v1/auth/wx-login', { method: 'POST', body: input })).data
    },
    async nativeLogin(input) {
      return (await http.request('/api/v1/auth/native-login', { method: 'POST', body: input })).data
    },

    // 已登录
    async logout() {
      return (await http.request('/api/v1/auth/logout', { method: 'POST' })).data
    },
    async me() {
      return (await http.request('/api/v1/auth/me', { method: 'GET' })).data
    },
    async updateMe(input) {
      return (await http.request('/api/v1/auth/me', { method: 'PATCH', body: input })).data
    },
    async changePassword(input) {
      return (await http.request('/api/v1/auth/me/password', { method: 'POST', body: input })).data
    },
    async logoutOthers() {
      return (await http.request('/api/v1/auth/me/logout-others', { method: 'POST' })).data
    },

    // 我的地址
    async listAddresses(params) {
      return (await http.request(path('/api/v1/me/addresses', params), { method: 'GET' })).data
    },
    async createAddress(input) {
      return (await http.request('/api/v1/me/addresses', { method: 'POST', body: input })).data
    },
    async updateAddress(id, input) {
      return (await http.request('/api/v1/me/addresses/' + id, { method: 'PATCH', body: input })).data
    },
    async deleteAddress(id) {
      return (await http.request('/api/v1/me/addresses/' + id, { method: 'DELETE' })).data
    },

    // 头像
    async uploadAvatar(file) {
      const fd = new FormData()
      fd.append('avatar', file)
      return (await http.request('/api/v1/me/avatar', { method: 'POST', body: fd, isForm: true })).data
    },

    // 我的设置
    async getSettings() {
      return (await http.request('/api/v1/me/settings', { method: 'GET' })).data
    },
    async updateSettings(input) {
      return (await http.request('/api/v1/me/settings', { method: 'PATCH', body: input })).data
    }
  }
}