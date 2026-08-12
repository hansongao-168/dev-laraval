import type { ReactNode } from 'react'

/**
 * (auth) 分组 layout — AuthFrame（居中卡片，无 Shell）。
 *
 * 后续接入 AuthFrame 真实组件；C7 阶段先给一个最小 shell。
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2 text-slate-900">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/25">
            E
          </span>
          <span className="font-semibold tracking-tight">ERP Global</span>
        </div>
        {children}
      </div>
    </div>
  )
}