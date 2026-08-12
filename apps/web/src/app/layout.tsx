import type { Metadata } from 'next'
import './globals.css'
import { getCurrentSession } from '@/lib/server-customer'

export const metadata: Metadata = {
  title: 'ERP Global',
  description: 'A global-first ERP experience powered by Laravel.',
}

/**
 * Root Layout（L0）
 *
 * 职责白名单（参考 docs/architecture/web-frontend.md §3）：
 * - 渲染 <html>/<body>
 * - 引入字体（next/font）、globals.css
 * - 全局 metadata / viewport
 * - 注入 SessionProvider（通过 SessionContext 隐式传递）
 *
 * **不**写业务逻辑；**不**调用业务 API（除 getCurrentSession）。
 */
export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getCurrentSession()

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col" data-session-status={session.status}>
        {/* Provider 链：C7 阶段以 data-* 暴露 session 状态；C5 阶段补 ThemeProvider/DeviceProvider */}
        {children}
      </body>
    </html>
  )
}