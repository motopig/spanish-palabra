import type { MouseEvent } from 'react'

const ACCENT_CHARS = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡']

const noFocus = { onMouseDown: (e: MouseEvent) => e.preventDefault() }

/** 点击插入西语特殊字符，走与键盘相同的 APPEND_CHAR 路径 */
export function AccentButtonBar({
  onInsert,
  disabled,
}: {
  onInsert: (char: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <span className="mr-1 text-xs text-slate-400">特殊字符</span>
      {ACCENT_CHARS.map((ch) => (
        <button
          key={ch}
          type="button"
          data-accent-key
          disabled={disabled}
          {...noFocus}
          onClick={() => onInsert(ch)}
          className="h-9 w-9 rounded-md border border-slate-200 bg-white font-mono text-lg text-slate-700 transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
        >
          {ch}
        </button>
      ))}
    </div>
  )
}
