import { useEffect, useRef } from 'react'

/** 是否应忽略抢焦点：点到这些元素时不强行把焦点拉回输入框 */
function shouldIgnore(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el?.closest) return true
  // 特殊字符按钮例外：点它后仍需把焦点交还输入框
  if (el.closest('[data-accent-key]')) return false
  return Boolean(
    el.closest('input,textarea,select,button,a,[data-no-refocus]'),
  )
}

export function InputCapture({
  value,
  onChange,
  onEscape,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onEscape?: () => void
  disabled?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const composing = useRef(false)

  useEffect(() => {
    ref.current?.focus()
    const refocus = (e: Event) => {
      if (shouldIgnore(e.target)) return
      ref.current?.focus()
    }
    window.addEventListener('pointerdown', refocus, true)
    return () => window.removeEventListener('pointerdown', refocus, true)
  }, [])

  return (
    <input
      ref={ref}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        if (!composing.current) onChange(e.target.value)
      }}
      onCompositionStart={() => {
        composing.current = true
      }}
      onCompositionEnd={(e) => {
        composing.current = false
        onChange(e.currentTarget.value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onEscape?.()
        }
      }}
      autoFocus
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="none"
      spellCheck={false}
      aria-label="输入当前单词"
      className="absolute inset-0 h-full w-full cursor-text appearance-none border-0 bg-transparent p-0 text-transparent caret-transparent outline-none"
    />
  )
}
