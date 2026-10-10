import type { ReactNode } from 'react'
import type { ChromeLink, DeviceClass } from '../chrome'

export function Brand({ href = '/' }: { href?: string }) {
  return (
    <a href={href} className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
        E
      </span>
      <span className="font-semibold tracking-tight text-slate-900">ERP Global</span>
    </a>
  )
}

export function LinkRow({
  items,
  className,
}: {
  items: ChromeLink[]
  className?: string
}) {
  return (
    <nav className={className}>
      {items.map((item) => (
        <a key={item.key} href={item.href} className="hover:text-slate-900">
          {item.label}
        </a>
      ))}
    </nav>
  )
}

export function ShellMain({ children }: { children: ReactNode }) {
  return <main className="min-w-0 flex-1">{children}</main>
}

export function deviceShellName(deviceClass: DeviceClass): string {
  return deviceClass
}
