import type { ReactNode } from 'react'

export function ListFrame({
  title,
  description,
  toolbar,
  children,
}: {
  title?: string
  description?: string
  toolbar?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12" data-frame="list">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          {title ? <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1> : null}
          {description ? <p className="mt-2 max-w-2xl text-slate-600">{description}</p> : null}
        </div>
        {toolbar}
      </div>
      {children}
    </div>
  )
}

export function DetailFrame({
  title,
  description,
  children,
}: {
  title?: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12" data-frame="detail">
      {title ? <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1> : null}
      {description ? <p className="mt-2 text-slate-600">{description}</p> : null}
      <div className="mt-8">{children}</div>
    </div>
  )
}

export function WorkspaceFrame({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12" data-frame="workspace">
      {title ? <h1 className="mb-8 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1> : null}
      <div className="grid gap-8">{children}</div>
    </div>
  )
}

export function EmptyFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12" data-frame="empty">
      {children}
    </div>
  )
}
