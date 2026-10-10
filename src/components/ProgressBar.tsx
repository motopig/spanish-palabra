export function ProgressBar({
  value,
  max,
}: {
  value: number
  max: number
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="h-full rounded-full bg-brand transition-all duration-200"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
