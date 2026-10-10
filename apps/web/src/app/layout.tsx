import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { aggregateNav } from '@erp/config'
import { inferInitialDeviceClass } from '@erp/devices'
import { nav as authNav } from '@erp/module-auth'
import { nav as storefrontNav } from '@erp/module-storefront'
import { nav as usersNav } from '@erp/module-users'
import { AppProviders } from '@/components/app-providers'
import './globals.css'
import { getCurrentSession } from '@/lib/server-customer'

export const metadata: Metadata = {
  title: 'ERP Global',
  description: 'A global-first ERP experience powered by Laravel.',
}

const navItems = aggregateNav([storefrontNav, authNav, usersNav])

/**
 * Root Layout（L0）
 *
 * 职责白名单（参考 docs/dev-laraval/architecture/web-frontend.md §3）：
 * - 渲染 <html>/<body>
 * - 引入字体（next/font）、globals.css
 * - 全局 metadata / viewport
 * - 注入 DeviceProvider + NavRegistryProvider；Session 仍以 data-* 暴露
 *
 * **不**写业务逻辑；**不**调用业务 API（除 getCurrentSession）。
 * **不**选择区级 Shell（Shell 仅在各区 L1）。
 */
export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getCurrentSession()
  const requestHeaders = await headers()
  const initialDeviceClass = inferInitialDeviceClass({
    viewportWidthHeader: requestHeaders.get('sec-ch-viewport-width'),
    userAgent: requestHeaders.get('user-agent'),
  })

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col" data-session-status={session.status}>
        <AppProviders initialDeviceClass={initialDeviceClass} navItems={navItems}>
          {children}
        </AppProviders>
      </body>
    </html>
  )
}
