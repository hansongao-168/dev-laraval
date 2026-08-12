import type { CustomerApi } from './domain/customer/auth.js'
import type { Customer, Address, CustomerSettings } from './domain/customer/types.js'
import type { ApiResponse, HealthPayload } from './core/types.js'
import type { HttpClient } from './core/http.js'

export interface ApiClient {
  url(path: string): string
  health(): Promise<ApiResponse<HealthPayload>>
  http: HttpClient
  customer: CustomerApi
}

export interface CreateApiClientOptions {
  baseUrl: string
  request?: ApiRequestHandler
}

export interface ApiRequest {
  url: string
  headers: Record<string, string>
}

export type ApiRequestHandler = (request: ApiRequest) => Promise<ApiResponse<unknown>>

export declare function createApiClient(options: CreateApiClientOptions): ApiClient

// 新 API
export { createHttp } from './core/http.js'
export type { HttpClient, HttpOptions, RequestOptions } from './core/http.js'
export type { ApiResponse, ApiError, ApiErrorKind } from './core/types.js'
export { createCustomerApi } from './domain/customer/auth.js'
export type { CustomerApi } from './domain/customer/auth.js'
export type {
  Customer,
  Address,
  CustomerSettings,
  CustomerToken,
  CustomerWithToken,
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  WxLoginInput,
  NativeLoginInput,
  AddressInput,
  SettingsInput,
  ValidationErrorResponse
} from './domain/customer/types.js'