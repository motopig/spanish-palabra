import { useAtomValue } from 'jotai'
import { useEffect, useReducer, useRef } from 'react'

import {
  createInitialState,
  summarize,
  typingReducer,
  type TypingAction,
  type TypingConfig,
  type TypingResume,
  type TypingState,
} from '@/core/typingMachine'
import { settingsAtom } from '@/store/settings'
import type { Word } from '@/types'

import { hasUserGesture, useSpeech } from './useSpeech'

export function useTypingSession(
  words: Word[],
  onComplete: (state: TypingState) => void,
  resume?: TypingResume | null,
) {
  const settings = useAtomValue(settingsAtom)
  const cfg: TypingConfig = {
    accentMode: settings.accentMode,
    shuffle: settings.shuffle,
  }

  const [state, dispatch] = useReducer(
    (s: TypingState, a: TypingAction) => typingReducer(s, a, cfg),
    undefined,
    () => createInitialState(words, cfg, resume),
  )

  const { speak } = useSpeech()
  const speakRef = useRef(speak)
  speakRef.current = speak
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const word = state.queue[state.cursor] ?? null
  const completedRef = useRef(false)

  // 换词自动朗读（iOS 需等首次用户手势）
  useEffect(() => {
    if (!settings.autoSpeak) return
    if (!hasUserGesture()) return
    if (word) void speakRef.current(word.name)
  }, [word?.name, settings.autoSpeak]) // eslint-disable-line react-hooks/exhaustive-deps

  // 章节完成
  useEffect(() => {
    if (state.phase === 'done' && !completedRef.current) {
      completedRef.current = true
      onCompleteRef.current(state)
    }
  }, [state])

  return { state, word, dispatch, summary: summarize(state) }
}
