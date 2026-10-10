import type { AccentMode, Word } from '@/types'

import { shuffle } from './chapter'
import { charEquals, charsOf, normalizeNFC } from './text'

export type Phase = 'active' | 'done'

export type TypingState = {
  phase: Phase
  /** 本章原始词表（未洗牌），用于重开章节 */
  sourceWords: Word[]
  /** 运行时队列，含打错后重新入队的词 */
  queue: Word[]
  /** 原始章节长度，用于算进度与队列上限 */
  baseLength: number
  cursor: number
  /** 当前词已输入的字符（NFC） */
  typed: string
  /** 当前这一轮是否已出错 → 输入被锁定，须清空重打 */
  errored: boolean
  /** 当前词累计错误次数（驱动重音提示） */
  errorTimes: number
  /** 当前词本轮是否出现过错误 → 决定完成后是否重新入队 */
  attemptErrored: boolean
  /** 本次会话打错过的词名（去重，结算页用） */
  wrongNames: string[]
  keystrokes: number
  correctKeystrokes: number
  startedAt: number
  finishedAt: number | null
}

export type TypingConfig = {
  accentMode: AccentMode
  shuffle?: boolean
}

export type TypingResume = {
  cursor: number
  /** 队列元素在章节原始词表中的下标序列 */
  queueIdx: number[]
}

export type TypingAction =
  | { type: 'UPDATE_INPUT'; value: string }
  | { type: 'APPEND_CHAR'; char: string }
  | { type: 'RESTART_CHAPTER' }

function buildQueue(words: Word[], cfg: TypingConfig): Word[] {
  return cfg.shuffle ? shuffle(words) : words.slice()
}

/** 用下标序列还原队列；任一下标越界（词库已变）即放弃续打 */
function restoreQueue(words: Word[], resume: TypingResume): Word[] | null {
  if (!Array.isArray(resume.queueIdx) || resume.queueIdx.length === 0) {
    return null
  }
  const queue: Word[] = []
  for (const i of resume.queueIdx) {
    const w = words[i]
    if (w === undefined) return null
    queue.push(w)
  }
  return queue
}

export function createInitialState(
  words: Word[],
  cfg: TypingConfig,
  resume?: TypingResume | null,
): TypingState {
  const restored = resume ? restoreQueue(words, resume) : null
  const queue = restored ?? buildQueue(words, cfg)
  const cursor =
    resume && restored
      ? Math.min(Math.max(0, resume.cursor), restored.length - 1)
      : 0
  return {
    phase: queue.length === 0 ? 'done' : 'active',
    sourceWords: words.slice(),
    queue,
    // 原始章节长度：重排队列会变长，但上限与进度都以它为准
    baseLength: words.length,
    cursor,
    typed: '',
    errored: false,
    errorTimes: 0,
    attemptErrored: false,
    wrongNames: [],
    keystrokes: 0,
    correctKeystrokes: 0,
    startedAt: Date.now(),
    finishedAt: null,
  }
}

/** 当前词完成后推进：打错过的词重新入队到队尾（队列上限 2×baseLength 保证终止） */
function advance(state: TypingState): TypingState {
  const word = state.queue[state.cursor]
  const shouldRequeue =
    state.attemptErrored && state.queue.length < state.baseLength * 2
  const queue = shouldRequeue ? [...state.queue, word] : state.queue
  const nextCursor = state.cursor + 1

  if (nextCursor >= queue.length) {
    return {
      ...state,
      queue,
      cursor: nextCursor,
      typed: '',
      errored: false,
      phase: 'done',
      finishedAt: Date.now(),
    }
  }
  return {
    ...state,
    queue,
    cursor: nextCursor,
    typed: '',
    errored: false,
    errorTimes: 0,
    attemptErrored: false,
  }
}

/** 追加单个字符。已锁定 / 越界直接忽略。 */
function appendChar(
  state: TypingState,
  ch: string,
  cfg: TypingConfig,
): TypingState {
  if (state.phase === 'done' || state.errored) return state
  const word = state.queue[state.cursor]
  if (!word) return state

  const tChars = charsOf(word.name)
  const i = charsOf(state.typed).length
  if (i >= tChars.length) return state

  const keystrokes = state.keystrokes + 1
  const normalized = normalizeNFC(ch)

  if (charEquals(ch, tChars[i], cfg.accentMode)) {
    const typed = state.typed + normalized
    const next: TypingState = {
      ...state,
      typed,
      keystrokes,
      correctKeystrokes: state.correctKeystrokes + 1,
    }
    return charsOf(typed).length === tChars.length ? advance(next) : next
  }

  return {
    ...state,
    typed: state.typed + normalized,
    errored: true,
    attemptErrored: true,
    errorTimes: state.errorTimes + 1,
    keystrokes,
    wrongNames: state.wrongNames.includes(word.name)
      ? state.wrongNames
      : [...state.wrongNames, word.name],
  }
}

/** 非前缀增长（罕见，如整段替换）时从零校验，遇首个不匹配即锁定 */
function validateFromScratch(
  state: TypingState,
  next: string,
  cfg: TypingConfig,
): TypingState {
  let s: TypingState = { ...state, typed: '', errored: false }
  for (const ch of next) {
    s = appendChar(s, ch, cfg)
    if (s.errored) break
  }
  return s
}

export function typingReducer(
  state: TypingState,
  action: TypingAction,
  cfg: TypingConfig,
): TypingState {
  switch (action.type) {
    case 'RESTART_CHAPTER':
      return createInitialState(state.sourceWords, cfg)

    case 'APPEND_CHAR':
      return appendChar(state, action.char, cfg)

    case 'UPDATE_INPUT': {
      const next = normalizeNFC(action.value)
      const cur = state.typed
      if (next === cur) return state

      // 退格
      if (next.length < cur.length) {
        if (state.errored) return { ...state, typed: '', errored: false }
        return { ...state, typed: next }
      }

      // 前缀增长：逐字符追加（粘贴多字符也走这条路，打错即锁定）
      if (next.startsWith(cur)) {
        let s = state
        for (const ch of next.slice(cur.length)) {
          s = appendChar(s, ch, cfg)
          if (s.errored) break
        }
        return s
      }

      return validateFromScratch(state, next, cfg)
    }
  }
}

export type TypingSummary = {
  elapsedMs: number
  wpm: number
  accuracy: number
  wrongCount: number
  total: number
}

export function summarize(state: TypingState): TypingSummary {
  const elapsedMs = (state.finishedAt ?? Date.now()) - state.startedAt
  const minutes = elapsedMs / 60000
  const wpm =
    minutes > 0 ? Math.round(state.correctKeystrokes / 5 / minutes) : 0
  const accuracy =
    state.keystrokes > 0 ? state.correctKeystrokes / state.keystrokes : 1
  return {
    elapsedMs,
    wpm,
    accuracy,
    wrongCount: state.wrongNames.length,
    total: state.baseLength,
  }
}
