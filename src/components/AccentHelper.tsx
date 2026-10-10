import { ACCENT_HINTS } from '@/constants'

/** 同一个词连错达到阈值后淡入，提示死键 / Alt 码打法 */
export function AccentHelper({
  visible,
  threshold = 2,
  errorTimes,
}: {
  visible: boolean
  threshold?: number
  errorTimes: number
}) {
  if (!visible || errorTimes < threshold) return null

  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
      <div className="mb-1.5 font-medium">打不出重音？试试这些组合：</div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-1 font-mono sm:grid-cols-4">
        {ACCENT_HINTS.map(([ch, mac, win]) => (
          <div key={ch} className="flex items-center gap-1.5">
            <span className="text-base text-amber-900">{ch}</span>
            <span className="text-amber-600">
              {mac} / {win}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
