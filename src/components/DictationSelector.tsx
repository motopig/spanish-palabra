import { useAtom } from 'jotai'

import { settingsAtom } from '@/store/settings'
import type { DictationMode } from '@/types'

const OPTIONS: { value: DictationMode; label: string }[] = [
  { value: 'none', label: '显示单词' },
  { value: 'hideVowel', label: '隐藏元音' },
  { value: 'hideConsonant', label: '隐藏辅音' },
  { value: 'hideAll', label: '全部隐藏' },
  { value: 'randomHide', label: '随机隐藏' },
]

/** 打字页工具条上的紧凑默写模式切换 */
export function DictationSelector() {
  const [settings, setSettings] = useAtom(settingsAtom)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() =>
            setSettings((prev) => ({ ...prev, dictationMode: o.value }))
          }
          className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
            settings.dictationMode === o.value
              ? 'bg-brand text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
