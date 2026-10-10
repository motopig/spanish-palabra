import { useAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SPEECH_LANG } from '@/constants'
import { settingsAtom } from '@/store/settings'

const supported =
  typeof window !== 'undefined' && 'speechSynthesis' in window

/** iOS 要求首个 speak 在用户手势内；自动朗读需等首次交互后再启用 */
let gestureSeen = false
if (typeof window !== 'undefined') {
  const mark = () => {
    gestureSeen = true
  }
  window.addEventListener('pointerdown', mark, { once: true })
  window.addEventListener('keydown', mark, { once: true })
}

export const hasUserGesture = () => gestureSeen

export function useSpeech() {
  const [settings] = useAtom(settingsAtom)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [speaking, setSpeaking] = useState(false)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (!supported) return
    const synth = window.speechSynthesis
    let stopped = false

    const load = () => {
      const all = synth.getVoices()
      if (!stopped && all.length) {
        voicesRef.current = all
        setVoices(all)
      }
    }

    load()
    synth.addEventListener?.('voiceschanged', load)
    // 部分浏览器不触发 voiceschanged，轮询兜底
    const timer = window.setInterval(() => {
      load()
      if (voicesRef.current.length) window.clearInterval(timer)
    }, 250)

    return () => {
      stopped = true
      synth.removeEventListener?.('voiceschanged', load)
      window.clearInterval(timer)
    }
  }, [])

  const spanishVoices = useMemo(
    () => voices.filter((v) => v.lang.toLowerCase().startsWith('es')),
    [voices],
  )

  const pickVoice = useCallback(
    (uri: string | null): SpeechSynthesisVoice | null => {
      if (uri) {
        const byUri = voices.find((v) => v.voiceURI === uri)
        if (byUri) return byUri
      }
      return (
        spanishVoices.find((v) => v.lang === SPEECH_LANG) ??
        spanishVoices[0] ??
        voices.find((v) => /spanish|español/i.test(v.name)) ??
        null
      )
    },
    [voices, spanishVoices],
  )

  const cancel = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    async (
      text: string,
      opts?: { rate?: number; voiceURI?: string | null },
    ) => {
      if (!supported || !text) return
      const synth = window.speechSynthesis
      synth.cancel()
      // cancel 紧跟 speak 会被吞掉，让出一个宏任务
      await new Promise((r) => setTimeout(r, 0))
      const u = new SpeechSynthesisUtterance(text)
      u.lang = SPEECH_LANG
      u.rate = opts?.rate ?? settings.speechRate
      u.pitch = 1
      const v = pickVoice(opts?.voiceURI ?? settings.voiceURI)
      if (v) {
        u.voice = v
        u.lang = v.lang
      }
      u.onstart = () => setSpeaking(true)
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      synth.speak(u)
    },
    [pickVoice, settings.speechRate, settings.voiceURI],
  )

  return {
    supported,
    voices: spanishVoices,
    allVoices: voices,
    speaking,
    speak,
    cancel,
  }
}
