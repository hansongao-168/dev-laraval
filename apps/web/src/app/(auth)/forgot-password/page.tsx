import { ForgotPasswordView } from '@erp/module-auth'
import { forgotPasswordAction } from '@/lib/server-customer'

export default function ForgotPasswordPage() {
  return <ForgotPasswordView action={forgotPasswordAction} />
}
