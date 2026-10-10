import type { ReactNode } from 'react'
import { AuthFrame } from '@erp/ui'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>
}
