export interface AuthFormState {
  error?: string
}

export type AuthFormAction = (
  state: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState> | AuthFormState

export type FormAction = (formData: FormData) => void | Promise<void>
