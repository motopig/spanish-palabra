export function SpeakerButton({
  onClick,
  disabled,
  speaking,
  className = '',
}: {
  onClick: () => void
  disabled?: boolean
  speaking?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label="朗读单词"
      title="朗读单词"
      className={`rounded-full p-2 transition-colors disabled:opacity-40 ${
        speaking
          ? 'text-brand'
          : 'text-slate-400 hover:bg-slate-100 hover:text-brand'
      } ${className}`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>
  )
}
