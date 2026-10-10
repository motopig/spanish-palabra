import { CHAPTER_LENGTH } from '@/constants'
import type { Word } from '@/types'

export const calcChapterCount = (wordCount: number): number =>
  Math.max(0, Math.ceil(wordCount / CHAPTER_LENGTH))

export function getChapterWords(words: Word[], chapter: number): Word[] {
  const start = chapter * CHAPTER_LENGTH
  return words.slice(start, start + CHAPTER_LENGTH)
}

/** Fisher-Yates 洗牌，返回新数组 */
export function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
