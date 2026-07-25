function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, '')
}

async function defaultRequest({ url, headers }) {
  const response = await fetch(url, { headers })

  return {
    ok: response.ok,
    status: response.status,
    data: await response.json()
  }
}

export function createApiClient({ baseUrl, request = defaultRequest }) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

  return {
    url(path) {
      return `${normalizedBaseUrl}/${path.replace(/^\/+/, '')}`
    },

    async health() {
      return request({
        url: `${normalizedBaseUrl}/health`,
        headers: { Accept: 'application/json' }
      })
    }
  }
}
