import type {
  Customer,
  CustomerWithToken,
  Address,
  CustomerSettings,
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  WxLoginInput,
  NativeLoginInput,
  AddressInput,
  SettingsInput
} from './types.js';

export interface CustomerApi {
  register(input: RegisterInput): Promise<Customer>;
  login(input: LoginInput): Promise<Customer>;
  forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }>;
  resetPassword(input: ResetPasswordInput): Promise<{ message: string }>;
  wxLogin(input: WxLoginInput): Promise<CustomerWithToken>;
  nativeLogin(input: NativeLoginInput): Promise<CustomerWithToken>;
  logout(): Promise<{ message: string }>;
  me(): Promise<Customer>;
  updateMe(input: UpdateProfileInput): Promise<Customer>;
  changePassword(input: ChangePasswordInput): Promise<{ message: string }>;
  logoutOthers(): Promise<{ message: string; revoked: number }>;
  listAddresses(params?: { per_page?: number }): Promise<{ data: Address[] }>;
  createAddress(input: AddressInput): Promise<Address>;
  updateAddress(id: number, input: AddressInput): Promise<Address>;
  deleteAddress(id: number): Promise<{ message: string }>;
  uploadAvatar(file: File): Promise<Customer>;
  getSettings(): Promise<CustomerSettings>;
  updateSettings(input: SettingsInput): Promise<CustomerSettings>;
}

export declare function createCustomerApi(http: { request<T>(path: string, options?: any): Promise<any> }): CustomerApi;