import { useAtom } from 'jotai'
import type { ReactNode } from 'react'

import { settingsAtom } from '@/store/settings'
import type { AccentMode, DictationMode, Settings } from '@/types'

import { useSpeech } from '@/hooks/useSpeech'

const ACCENT_OPTIONS: { value: AccentMode; label: string }[] = [
  { value: 'lenient', label: '宽松（重音可省）' },
  { value: 'strict', label: '严格（须打重音）' },
  { value: 'ignore-tilde', label: '忽略 ñ' },
]

const DICTATION_OPTIONS: { value: DictationMode; label: string }[] = [
  { value: 'none', label: '无' },
  { value: 'hideVowel', label: '隐藏元音' },
  { value: 'hideConsonant', label: '隐藏辅音' },
  { value: 'hideAll', label: '全部隐藏' },
  { value: 'randomHide', label: '随机隐藏' },
]

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
            value === o.value
              ? 'border-brand bg-brand/5 text-brand'
              : 'border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [settings, setSettings] = useAtom(settingsAtom)
  const { voices, supported, speak } = useSpeech()

  if (!open) return null

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="fixed inset-0 z-50" data-no-refocus>
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col gap-5 overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">设置</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            关闭
          </button>
        </div>

        <Field label="拼写严格度">
          <Segmented
            value={settings.accentMode}
            options={ACCENT_OPTIONS}
            onChange={(v) => update('accentMode', v)}
          />
        </Field>

        <Field label="默写模式">
          <Segmented
            value={settings.dictationMode}
            options={DICTATION_OPTIONS}
            onChange={(v) => update('dictationMode', v)}
          />
        </Field>

        <Field label={`字号　${settings.fontSize}px`}>
          <input
            type="range"
            min={28}
            max={72}
            step={2}
            value={settings.fontSize}
            onChange={(e) => update('fontSize', Number(e.target.value))}
            className="w-full accent-brand"
          />
        </Field>

        <label className="flex items-center justify-between text-sm text-slate-700">
          <span>随机顺序</span>
          <input
            type="checkbox"
            checked={settings.shuffle}
            onChange={(e) => update('shuffle', e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
        </label>

        <hr className="border-slate-100" />

        <label className="flex items-center justify-between text-sm text-slate-700">
          <span>自动朗读</span>
          <input
            type="checkbox"
            checked={settings.autoSpeak}
            onChange={(e) => update('autoSpeak', e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
        </label>

        <Field label={`语速　${settings.speechRate.toFixed(2)}`}>
          <input
            type="range"
            min={0.5}
            max={1.3}
            step={0.05}
            value={settings.speechRate}
            onChange={(e) => update('speechRate', Number(e.target.value))}
            className="w-full accent-brand"
          />
        </Field>

        {supported ? (
          <Field label="发音音色">
            <div className="flex gap-2">
              <select
                value={settings.voiceURI ?? ''}
                onChange={(e) =>
                  update('voiceURI', e.target.value || null)
                }
                className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="">（自动选择西班牙语）</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void speak('hola, ¿cómo estás?')}
                className="rounded-md border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50"
              >
                试听
              </button>
            </div>
          </Field>
        ) : (
          <p className="text-xs text-slate-400">
            当前浏览器不支持语音合成，已隐藏发音功能。
          </p>
        )}
      </aside>
    </div>
  )
}
