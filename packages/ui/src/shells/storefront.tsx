import type { ReactNode } from 'react'
import { splitChromeLinks, type ChromeLink, type DeviceClass } from '../chrome'
import { Brand, LinkRow, ShellMain } from './shared'

export function StorefrontChrome({
  deviceClass,
  headerItems,
  footerItems,
  accountSlot,
  children,
}: {
  deviceClass: DeviceClass
  headerItems: ChromeLink[]
  footerItems: ChromeLink[]
  accountSlot: ReactNode
  children: ReactNode
}) {
  const tabLimit = deviceClass === 'mobile' ? 4 : deviceClass === 'tablet' ? 5 : 8
  const { primary, more } = splitChromeLinks(headerItems, tabLimit)

  if (deviceClass === 'mobile') {
    return (
      <div className="flex min-h-screen flex-col bg-white text-slate-950" data-device-shell="mobile">
        <header className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Brand />
            {accountSlot}
          </div>
        </header>
        <ShellMain>{children}</ShellMain>
        <footer className="border-t border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          <LinkRow items={footerItems} className="flex flex-wrap gap-4" />
        </footer>
        {more.length > 0 ? (
          <div className="border-t border-slate-100 bg-white px-4 py-2 text-sm text-slate-600">
            <LinkRow items={more} className="flex flex-wrap gap-3" />
          </div>
        ) : null}
        <nav className="sticky bottom-0 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] text-center text-sm font-medium text-slate-700">
          {primary.map((item) => (
            <a key={item.key} href={item.href} className="py-3">
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-white text-slate-950"
      data-device-shell={deviceClass}
    >
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Brand />
          <div className="flex items-center gap-4 text-sm font-medium text-slate-700">
            <LinkRow items={primary} className="flex flex-wrap items-center gap-4" />
            {accountSlot}
          </div>
        </div>
      </header>
      <ShellMain>{children}</ShellMain>
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-6 py-8 text-sm text-slate-600">
          <span>© ERP Global</span>
          <LinkRow items={footerItems} className="flex flex-wrap gap-4" />
        </div>
      </footer>
    </div>
  )
}
