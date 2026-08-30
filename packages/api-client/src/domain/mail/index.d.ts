import type {
  OtpResult,
  SendTemplateInput,
  MailWebhookEndpoint,
  CreateWebhookEndpointInput,
  UpdateWebhookEndpointInput,
  MailAccount,
  MailAccountStatusPayload,
  RegisterMailAccountInput,
  UpdateMailAccountInput,
  GmailOAuthPayload,
  MailSyncRun,
  MailMessageSummary,
  SendMailInput,
  SendMailResult,
  SyncDispatchPayload,
  PaginatedMeta
} from './types.js'

export interface MailApi {
  listAccounts(query?: { page?: number; per_page?: number }): Promise<{ data: MailAccount[]; meta: PaginatedMeta }>
  getAccount(id: number): Promise<{ data: MailAccount }>
  createAccount(input: RegisterMailAccountInput): Promise<{ message: string; data: MailAccount }>
  updateAccount(id: number, input: UpdateMailAccountInput): Promise<{ message: string; data: MailAccount }>
  deleteAccount(id: number): Promise<{ message: string }>
  setDefaultAccount(id: number): Promise<{ message: string; data: MailAccount }>
  getAccountStatus(id: number): Promise<{ data: MailAccountStatusPayload }>

  createGmailOAuthUrl(id: number): Promise<{ data: GmailOAuthPayload }>
  setQqAuthorizationCode(id: number, code: string): Promise<{ message: string; data: { qq: { imap_password_masked: string | null; smtp_password_masked: string | null } } }>

  triggerSync(id: number): Promise<{ message: string; data: SyncDispatchPayload }>
  syncAll(): Promise<{ message: string; data: SyncDispatchPayload }>
  listSyncRuns(accountId: number, query?: { page?: number; per_page?: number }): Promise<{ data: MailSyncRun[]; meta: PaginatedMeta }>
  getSyncRun(id: number): Promise<{ data: MailSyncRun }>
  markSeen(messageId: number): Promise<{ message: string; data: MailMessageSummary }>

  listMessages(accountId: number, query?: { page?: number; per_page?: number; folder?: string; q?: string }): Promise<{ data: MailMessageSummary[]; meta: PaginatedMeta }>
  getOtp(id: number, query?: { from?: string; subject?: string; ttl?: number }): Promise<{ data: OtpResult }>
  getMessage(id: number): Promise<{ data: MailMessageSummary }>
  attachmentDownloadUrl(id: number): string

  send(input: SendMailInput): Promise<{ message: string; data: SendMailResult }>
  sendForm(form: FormData): Promise<{ message: string; data: SendMailResult }>
  sendTemplate(input: SendTemplateInput): Promise<{ message: string; data: SendMailResult }>

  listWebhookEndpoints(): Promise<{ data: MailWebhookEndpoint[] }>
  createWebhookEndpoint(input: CreateWebhookEndpointInput): Promise<{ message: string; data: MailWebhookEndpoint }>
  updateWebhookEndpoint(id: number, input: UpdateWebhookEndpointInput): Promise<{ message: string; data: MailWebhookEndpoint }>
  deleteWebhookEndpoint(id: number): Promise<{ message: string }>
}

export declare function createMailApi(
  http: { request(path: string, options?: any): Promise<any>; url(path: string): string },
  options?: { getToken?: () => string | null }
): MailApi
