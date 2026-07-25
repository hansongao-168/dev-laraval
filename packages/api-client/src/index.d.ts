export interface ApiResponse<T> {
  ok: boolean
  status: number
  data: T
}

export interface HealthPayload {
  data: {
    status: 'ok'
    api_version: 'v1'
    timestamp: string
  }
}

export interface ApiRequest {
  url: string
  headers: Record<string, string>
}

export type ApiRequestHandler = (
  request: ApiRequest
) => Promise<ApiResponse<unknown>>

export interface ApiClient {
  url(path: string): string
  health(): Promise<ApiResponse<HealthPayload>>
}

export function createApiClient(options: {
  baseUrl: string
  request?: ApiRequestHandler
}): ApiClient
