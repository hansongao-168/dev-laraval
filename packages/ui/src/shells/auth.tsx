import type { ReactNode } from 'react'
import { Brand } from './shared'

export function AuthFrame({ children }: { children: ReactNode; title?: string; description?: string; toolbar?: ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-6 py-12"
      data-device-shell="auth"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <Brand href="/" />
        </div>
        {children}
      </div>
    </div>
  )
}
