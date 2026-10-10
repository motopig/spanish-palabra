import type { AccentMode } from '@/types'

/** ´ (重音) 与 ¨ (分音) —— 语义弱，lenient 档放宽 */
const ACUTE_COMBINING = /[\u0301\u0308]/g
/** 全部组合记号，含 ˜ —— 仅 ignore-tilde 档使用 */
const ALL_COMBINING = /[\u0300-\u036f]/g

export const normalizeNFC = (s: string): string => s.normalize('NFC')

/**
 * 剥离重音符与分音符，保留 ñ (U+0303)。
 * 依据：á/a 几不构成词义对立，而 ñ/n 有真实对立（año/ano、niño/nino）。
 */
export const foldAccents = (s: string): string =>
  s
    .normalize('NFD')
    .replace(ACUTE_COMBINING, '')
    .normalize('NFC')
    .toLowerCase()

/** 连 ñ 也放宽（ñ -> n），仅供 ignore-tilde 档使用 */
export const foldAll = (s: string): string =>
  s
    .normalize('NFD')
    .replace(ALL_COMBINING, '')
    .normalize('NFC')
    .toLowerCase()

/** 逐字符切分：NFC 下每个字符即一个码位，Array.from 对代理对安全 */
export const charsOf = (word: string): string[] => Array.from(normalizeNFC(word))

/** 单个字符是否算匹配。所有档位大小写不敏感，档位差异只在重音/波浪符。 */
export function charEquals(
  input: string,
  target: string,
  mode: AccentMode,
): boolean {
  const i = normalizeNFC(input)
  const t = normalizeNFC(target)
  if (mode === 'strict') return i.toLowerCase() === t.toLowerCase()
  if (mode === 'lenient') return foldAccents(i) === foldAccents(t)
  return foldAll(i) === foldAll(t)
}
