/** Mail 子域类型 — 与 gz168/Mail API 响应一一对应。 */

export type MailProvider = 'gmail' | 'qq'

export type MailAccountStatus = 'active' | 'disabled' | 'error'

export interface MailAccount {
  id: number
  name: string
  provider: MailProvider
  provider_label: string
  email_address: string
  display_name: string | null
  status: MailAccountStatus
  status_label: string
  is_default: boolean
  is_authorized: boolean
  last_synced_at: string | null
  last_error: string | null
  owner_user_id: number | null
  credentials: {
    gmail: { oauth_refresh_token_masked: string | null }
    qq: {
      imap_password_masked: string | null
      smtp_password_masked: string | null
    }
  } | null
  created_at: string | null
  updated_at: string | null
}

export interface MailAccountStatusPayload {
  provider: MailProvider
  status: MailAccountStatus
  is_default: boolean
  is_authorized: boolean
  gmail: { oauth_bound: boolean; oauth_refresh_token_masked: string | null }
  qq: {
    imap_password_bound: boolean
    imap_password_masked: string | null
    smtp_password_masked: string | null
  }
  last_synced_at: string | null
  last_error: string | null
}

export interface RegisterMailAccountInput {
  name: string
  provider: MailProvider
  email_address: string
  display_name?: string | null
  is_default?: boolean
  qq_authorization_code?: string
}

export interface UpdateMailAccountInput {
  name?: string
  display_name?: string | null
  status?: MailAccountStatus
  is_default?: boolean
  sync_enabled?: boolean
  sync_interval_minutes?: number | null
}

export interface GmailOAuthPayload {
  url: string
  state: string
  redirect_uri: string
}

export type MailSyncTrigger = 'manual' | 'scheduled' | 'command'

export type MailSyncRunStatus = 'running' | 'success' | 'failed' | 'partial'

export interface MailSyncRun {
  id: number
  mail_account_id: number
  trigger: MailSyncTrigger
  trigger_label: string
  status: MailSyncRunStatus
  status_label: string
  started_at: string | null
  finished_at: string | null
  duration_ms: number | null
  folders_scanned: string[]
  messages_fetched: number
  messages_inserted: number
  messages_updated: number
  error_summary: string | null
  created_by: number | null
}

export interface MailMessageSummary {
  id: number
  mail_account_id: number
  folder: string
  remote_uid: string
  message_id: string | null
  subject: string | null
  from_address: string | null
  from_name: string | null
  to_addresses: string[]
  cc_addresses: string[]
  sent_at: string | null
  received_at: string | null
  is_read: boolean
  is_flagged: boolean
  has_attachments: boolean
  snippet: string | null
  body_html?: string | null
  body_text?: string | null
}

export interface SendMailInput {
  account_id: number
  to: string
  subject: string
  body: string
  html?: boolean
  cc?: string[]
  attachments?: Array<{
    filename: string
    mime_type?: string | null
    content: string
  }>
}

export interface SendMailResult {
  provider: MailProvider
  remote_id: string | null
}

export interface PaginatedMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface SyncDispatchPayload {
  account_id?: number
  count?: number
  queued_at: string
  trigger?: MailSyncTrigger
}
