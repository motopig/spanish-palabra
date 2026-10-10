export type Word = {
  /** 西语原词，NFC 归一化，如 "cámara" */
  name: string
  /** 中文释义，如 ["相机", "照相机"] */
  trans: string[]
  /** IPA 音标，如 "ˈkamaɾa" */
  phonetic?: string
  /** 词性，如 "n.f." / "v." / "adj." */
  pos?: string
  /** 例句（展示用，不参与打字） */
  example?: string
}

export type DictionaryMeta = {
  id: string
  name: string
  description: string
  /** 'es-core' | 'custom' */
  category: string
  tags: string[]
  language: 'es'
  languageCategory: string
  /** 由脚本 / 导入逻辑计算，永不手写 */
  wordCount: number
  /** '/dicts/es-top500.json' | 'inline' */
  file: string
  custom?: boolean
}

export type Dictionary = DictionaryMeta & { words: Word[] }

export type AccentMode = 'strict' | 'lenient' | 'ignore-tilde'

export type DictationMode =
  | 'none'
  | 'hideAll'
  | 'hideVowel'
  | 'hideConsonant'
  | 'randomHide'

export type PageName = 'gallery' | 'typing' | 'result'

export type Settings = {
  accentMode: AccentMode
  dictationMode: DictationMode
  fontSize: number
  shuffle: boolean
  autoSpeak: boolean
  speechRate: number
  /** 用户选定的音色 URI；voice 对象不可序列化，只存 URI */
  voiceURI: string | null
}

export type ChapterProgress = {
  /** 已完成章节的下标集合 */
  done: number[]
  lastChapter: number
  updatedAt: number
}

export type ProgressMap = Record<string, ChapterProgress>

/**
 * 章节内续打位置。`queueIdx` 是队列元素在章节原始词表（`sourceWords`）中的下标序列，
 * 因此能还原洗牌顺序与「打错后重新入队到队尾」的词；`cursor` 为当前词在该队列中的下标。
 */
export type ChapterResume = {
  cursor: number
  queueIdx: number[]
}

export type ResumeMap = Record<string, ChapterResume>

export type CustomDictMap = Record<string, Dictionary>
