import type { DictationMode } from '@/types'

import { charsOf } from './text'

const VOWELS = new Set([
  'a',
  'e',
  'i',
  'o',
  'u',
  'á',
  'é',
  'í',
  'ó',
  'ú',
  'ü',
])

const isVowel = (c: string) => VOWELS.has(c.toLowerCase())

/** 基于词名的稳定伪随机，保证 randomHide 在多次渲染间不闪烁 */
function seededBits(word: string, len: number): boolean[] {
  let h = 2166136261
  for (const c of word) {
    h ^= c.codePointAt(0) ?? 0
    h = Math.imul(h, 16777619)
  }
  const out: boolean[] = []
  for (let i = 0; i < len; i++) {
    h ^= i
    h = Math.imul(h, 16777619)
    out.push(((h >>> 0) % 100) < 50)
  }
  return out
}

/**
 * 生成遮蔽标记：true 表示该位置在默写模式下不显示目标字符。
 * 长度与 charsOf(word) 对齐。
 */
export function buildMask(word: string, mode: DictationMode): boolean[] {
  const chars = charsOf(word)
  switch (mode) {
    case 'none':
      return chars.map(() => false)
    case 'hideAll':
      return chars.map(() => true)
    case 'hideVowel':
      return chars.map(isVowel)
    case 'hideConsonant':
      return chars.map((c) => !isVowel(c))
    case 'randomHide':
      return seededBits(word, chars.length)
  }
}
