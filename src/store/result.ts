import { atom } from 'jotai'

import type { TypingSummary } from '@/core/typingMachine'

export type ChapterResult = {
  dictId: string
  dictName: string
  chapter: number
  summary: TypingSummary
  wrongNames: string[]
}

/** 内存态（不持久化）：承载最近一次章节结果供 Result 页读取 */
export const lastResultAtom = atom<ChapterResult | null>(null)
