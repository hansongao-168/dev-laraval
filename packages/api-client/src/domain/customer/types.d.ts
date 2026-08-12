/**
 * Customer 子域类型 — 与 gz168/Customer/resources/contracts/customer-openapi.yaml
 * 字段一一对应；CI 由 OpenApiSchemaTest 强制。
 *
 * 黑名单字段（password/remember_token/wx_openid/wx_unionid）不出现在前端类型；
 * 后台专属字段（banned_at/last_login_*）不出现在前台 Customer 类型。
 */

export interface Customer {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  email_verified_at: string | null;
  locale: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: number;
  customer_id: number;
  label: string | null;
  contact_name: string;
  contact_phone: string;
  region: string;
  detail: string;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerSettings {
  locale: string;
  timezone: string;
}

export interface CustomerToken {
  token_type: 'Bearer';
  access_token: string;
  expires_in: number;
}

export interface CustomerWithToken {
  customer: Customer;
  token: CustomerToken;
}

// Request types

export interface RegisterInput {
  name?: string | null;
  email: string;
  phone?: string | null;
  password: string;
  password_confirmation: string;
  locale?: string | null;
  timezone?: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
  remember?: boolean;
}

export interface UpdateProfileInput {
  name?: string | null;
  phone?: string | null;
  locale?: string | null;
  timezone?: string | null;
}

export interface ChangePasswordInput {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  email: string;
  password: string;
  password_confirmation: string;
  token: string;
}

export interface WxLoginInput {
  code: string;
}

export interface NativeLoginInput {
  email: string;
  password: string;
  device_name?: string | null;
}

export interface AddressInput {
  label?: string | null;
  contact_name: string;
  contact_phone: string;
  region: string;
  detail: string;
  postal_code?: string | null;
  is_default?: boolean;
}

export interface SettingsInput {
  locale?: string | null;
  timezone?: string | null;
}

// Response helpers

export interface ValidationErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}