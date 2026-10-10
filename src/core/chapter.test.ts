import { describe, expect, it } from 'vitest'

import { CHAPTER_LENGTH } from '@/constants'
import type { Word } from '@/types'

import { calcChapterCount, getChapterWords, shuffle } from './chapter'

const mkWords = (n: number): Word[] =>
  Array.from({ length: n }, (_, i) => ({ name: `w${i}`, trans: ['x'] }))

describe('calcChapterCount', () => {
  it('按 CHAPTER_LENGTH 向上取整', () => {
    expect(CHAPTER_LENGTH).toBe(20)
    expect(calcChapterCount(500)).toBe(25)
    expect(calcChapterCount(200)).toBe(10)
    expect(calcChapterCount(21)).toBe(2)
    expect(calcChapterCount(20)).toBe(1)
  })

  it('空词库为 0 章', () => {
    expect(calcChapterCount(0)).toBe(0)
  })
})

describe('getChapterWords', () => {
  const words = mkWords(45)

  it('返回对应章节切片', () => {
    expect(getChapterWords(words, 0)).toHaveLength(20)
    expect(getChapterWords(words, 0)[0].name).toBe('w0')
    expect(getChapterWords(words, 2)).toHaveLength(5)
    expect(getChapterWords(words, 2)[0].name).toBe('w40')
  })

  it('越界返回空数组', () => {
    expect(getChapterWords(words, 9)).toEqual([])
  })
})

describe('shuffle', () => {
  it('保持元素集合不变', () => {
    const input = mkWords(50)
    const out = shuffle(input)
    expect(out).toHaveLength(50)
    expect(out.map((w) => w.name).sort()).toEqual(
      input.map((w) => w.name).sort(),
    )
  })

  it('不修改原数组', () => {
    const input = mkWords(10)
    const before = input.map((w) => w.name)
    shuffle(input)
    expect(input.map((w) => w.name)).toEqual(before)
  })
})
