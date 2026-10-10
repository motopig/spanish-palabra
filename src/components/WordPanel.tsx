import clsx from 'clsx'

import { EXPLICIT_SPACE, MASK_CHAR } from '@/constants'
import { buildMask } from '@/core/dictation'
import { charEquals, charsOf } from '@/core/text'
import type { AccentMode, DictationMode, Word } from '@/types'

export function WordPanel({
  word,
  typed,
  accentMode,
  dictationMode,
  fontSize,
}: {
  word: Word
  typed: string
  accentMode: AccentMode
  dictationMode: DictationMode
  fontSize: number
}) {
  const chars = charsOf(word.name)
  const typedChars = charsOf(typed)
  const mask = buildMask(word.name, dictationMode)

  return (
    <div className="select-none text-center">
      <div
        className="flex flex-wrap justify-center font-mono leading-tight tracking-wide"
        style={{ fontSize }}
      >
        {chars.map((ch, i) => {
          const isTyped = i < typedChars.length
          const ok = isTyped && charEquals(typedChars[i], ch, accentMode)
          const display = isTyped ? typedChars[i] : mask[i] ? MASK_CHAR : ch
          return (
            <span
              key={i}
              className={clsx(
                'inline-block',
                !isTyped
                  ? mask[i]
                    ? 'text-slate-300'
                    : 'text-slate-400'
                  : ok
                    ? 'text-emerald-500'
                    : 'text-rose-500',
              )}
            >
              {display === ' ' ? EXPLICIT_SPACE : display}
            </span>
          )
        })}
      </div>

      <div className="mt-6 space-y-1.5">
        {word.phonetic && (
          <div className="font-mono text-slate-500">/{word.phonetic}/</div>
        )}
        <div className="text-slate-700">
          {word.pos && (
            <span className="mr-2 italic text-slate-400">{word.pos}</span>
          )}
          {word.trans.join('；')}
        </div>
      </div>
    </div>
  )
}
