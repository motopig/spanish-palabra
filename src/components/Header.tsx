import type { ReactNode } from 'react'

export function Header({
  title,
  subtitle,
  left,
  right,
}: {
  title: string
  subtitle?: string
  left?: ReactNode
  right?: ReactNode
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
        {left}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  )
}
