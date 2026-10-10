import type { ReactNode } from 'react'
import { splitChromeLinks, type ChromeLink, type DeviceClass } from '../chrome'
import { Brand, ShellMain } from './shared'

export function AccountChrome({
  deviceClass,
  sidebarItems,
  mobileItems,
  accountSlot,
  children,
}: {
  deviceClass: DeviceClass
  sidebarItems: ChromeLink[]
  mobileItems: ChromeLink[]
  accountSlot: ReactNode
  children: ReactNode
}) {
  const tabSource = mobileItems.length > 0 ? mobileItems : sidebarItems
  const { primary, more } = splitChromeLinks(tabSource, 4)

  if (deviceClass === 'mobile') {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50" data-device-shell="mobile">
        <header className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Brand />
            {accountSlot}
          </div>
        </header>
        <div className="flex-1 px-4 py-6">
          <ShellMain>{children}</ShellMain>
        </div>
        <nav className="sticky bottom-0 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] text-center text-sm font-medium text-slate-700">
          {primary.map((item) => (
            <a key={item.key} href={item.href} className="py-3">
              {item.label}
            </a>
          ))}
        </nav>
        {more.length > 0 ? (
          <div className="border-t border-slate-100 bg-white px-4 py-2 text-sm">
            {more.map((item) => (
              <a key={item.key} href={item.href} className="mr-3 text-slate-600">
                {item.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  if (deviceClass === 'tablet') {
    return (
      <div className="min-h-screen bg-slate-50" data-device-shell="tablet">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Brand />
            {accountSlot}
          </div>
          <nav className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-6 pb-3 text-sm font-medium text-slate-700">
            {sidebarItems.map((item) => (
              <a key={item.key} href={item.href} className="rounded-lg px-3 py-2 hover:bg-white">
                {item.label}
              </a>
            ))}
          </nav>
        </header>
        <div className="mx-auto max-w-5xl px-6 py-8">
          <ShellMain>{children}</ShellMain>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50" data-device-shell="desktop">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Brand />
          {accountSlot}
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        <aside className="w-56 shrink-0">
          <nav className="flex flex-col gap-1">
            {sidebarItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>
        <ShellMain>{children}</ShellMain>
      </div>
    </div>
  )
}
