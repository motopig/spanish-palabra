import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'

import { AccentButtonBar } from '@/components/AccentButtonBar'
import { AccentHelper } from '@/components/AccentHelper'
import { DictationSelector } from '@/components/DictationSelector'
import { Header } from '@/components/Header'
import { InputCapture } from '@/components/InputCapture'
import { ProgressBar } from '@/components/ProgressBar'
import { SettingsDrawer } from '@/components/SettingsDrawer'
import { SpeakerButton } from '@/components/SpeakerButton'
import { WordPanel } from '@/components/WordPanel'
import { Button } from '@/components/ui/Button'
import { getChapterWords } from '@/core/chapter'
import { summarize, type TypingState } from '@/core/typingMachine'
import { useDictionary } from '@/hooks/useDictionary'
import { useSpeech } from '@/hooks/useSpeech'
import { useTypingSession } from '@/hooks/useTypingSession'
import { markChapterDone, progressAtom } from '@/store/progress'
import { lastResultAtom } from '@/store/result'
import {
  currentChapterAtom,
  currentDictIdAtom,
  pageAtom,
  resumeKey,
  typingResumeAtom,
} from '@/store/session'
import { settingsAtom } from '@/store/settings'
import type { Word } from '@/types'

const noFocus = { onMouseDown: (e: MouseEvent) => e.preventDefault() }

function Message({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 text-slate-500">
      {children}
    </div>
  )
}

export function Typing() {
  const dictId = useAtomValue(currentDictIdAtom)
  const chapter = useAtomValue(currentChapterAtom)
  const { dict, loading, error } = useDictionary(dictId)

  if (loading) return <Message>加载中…</Message>
  if (error || !dict) return <Message>{error ?? '词库不存在'}</Message>

  const words = getChapterWords(dict.words, chapter)
  return (
    <TypingSession
      key={`${dict.id}:${chapter}`}
      words={words}
      dictId={dict.id}
      dictName={dict.name}
      chapter={chapter}
    />
  )
}

function TypingSession({
  words,
  dictId,
  dictName,
  chapter,
}: {
  words: Word[]
  dictId: string
  dictName: string
  chapter: number
}) {
  const settings = useAtomValue(settingsAtom)
  const setProgress = useSetAtom(progressAtom)
  const setResult = useSetAtom(lastResultAtom)
  const setPage = useSetAtom(pageAtom)
  const resumes = useAtomValue(typingResumeAtom)
  const setResumes = useSetAtom(typingResumeAtom)
  const { speak, speaking, supported } = useSpeech()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const slot = resumeKey(dictId, chapter)

  const onComplete = useCallback(
    (state: TypingState) => {
      setProgress((prev) => markChapterDone(prev, dictId, chapter))
      setResult({
        dictId,
        dictName,
        chapter,
        summary: summarize(state),
        wrongNames: state.wrongNames,
      })
      setPage('result')
    },
    [dictId, dictName, chapter, setProgress, setResult, setPage],
  )

  const { state, word, dispatch } = useTypingSession(
    words,
    onComplete,
    resumes[slot],
  )

  // 记住「打到第几个词」：每推进一词写盘，回到队首或整章完成则清除
  const { cursor, phase, queue, sourceWords } = state
  useEffect(() => {
    setResumes((prev) => {
      if (phase === 'done' || cursor === 0) {
        if (!(slot in prev)) return prev
        const next = { ...prev }
        delete next[slot]
        return next
      }
      const queueIdx = queue.map((x) => sourceWords.indexOf(x))
      return { ...prev, [slot]: { cursor, queueIdx } }
    })
  }, [cursor, phase, queue, sourceWords, slot, setResumes])

  if (!word) return <Message>本章没有单词</Message>

  return (
    <div className="min-h-full">
      <Header
        title={dictName}
        subtitle={`第 ${chapter + 1} 章 · ${state.cursor + 1} / ${state.queue.length}`}
        left={
          <Button
            variant="ghost"
            size="sm"
            {...noFocus}
            onClick={() => setPage('gallery')}
          >
            ← 返回
          </Button>
        }
        right={
          <>
            {supported && (
              <SpeakerButton
                onClick={() => void speak(word.name)}
                speaking={speaking}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              {...noFocus}
              onClick={() => setSettingsOpen(true)}
            >
              设置
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6">
          <ProgressBar value={state.cursor} max={state.queue.length} />
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">默写模式</span>
          <DictationSelector />
        </div>

        <div className="relative rounded-2xl border border-slate-200 bg-white px-6 py-16 shadow-sm">
          <InputCapture
            value={state.typed}
            onChange={(v) => dispatch({ type: 'UPDATE_INPUT', value: v })}
            onEscape={() => setPage('gallery')}
          />
          <WordPanel
            word={word}
            typed={state.typed}
            accentMode={settings.accentMode}
            dictationMode={settings.dictationMode}
            fontSize={settings.fontSize}
          />
        </div>

        <AccentHelper visible errorTimes={state.errorTimes} />

        <div className="mt-6">
          <AccentButtonBar
            disabled={state.errored}
            onInsert={(c) => dispatch({ type: 'APPEND_CHAR', char: c })}
          />
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          打错需退格清空后整词重打 · 按 Esc 返回
        </p>
      </main>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
