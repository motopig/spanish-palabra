import { describe, expect, it } from 'vitest'

import {
  charEquals,
  charsOf,
  foldAccents,
  foldAll,
  normalizeNFC,
} from './text'

describe('foldAccents', () => {
  it('剥离重音符', () => {
    expect(foldAccents('cámara')).toBe('camara')
    expect(foldAccents('sí')).toBe('si')
  })

  it('剥离分音符 ü', () => {
    expect(foldAccents('pingüino')).toBe('pinguino')
  })

  it('保留 ñ', () => {
    expect(foldAccents('niño')).toBe('niño')
    expect(foldAccents('año')).toBe('año')
  })

  it('大小写归一', () => {
    expect(foldAccents('AÑO')).toBe('año')
  })
})

describe('foldAll', () => {
  it('连 ñ 一起放宽', () => {
    expect(foldAll('niño')).toBe('nino')
    expect(foldAll('año')).toBe('ano')
    expect(foldAll('cámara')).toBe('camara')
  })
})

describe('normalizeNFC', () => {
  it('把 NFD 分解形式转成 NFC 单码位', () => {
    const decomposed = 'cámara'.normalize('NFD')
    expect(decomposed.length).toBeGreaterThan('cámara'.length)
    expect(normalizeNFC(decomposed)).toBe('cámara')
  })
})

describe('charsOf', () => {
  it('按字符切分，重音算一个字符', () => {
    expect(charsOf('niño')).toEqual(['n', 'i', 'ñ', 'o'])
    expect(charsOf('cámara')).toHaveLength(6)
  })

  it('NFD 输入也能正确切分', () => {
    expect(charsOf('niño'.normalize('NFD'))).toEqual(['n', 'i', 'ñ', 'o'])
  })
})

describe('charEquals', () => {
  it('strict：重音必须对上，但大小写不敏感', () => {
    expect(charEquals('á', 'á', 'strict')).toBe(true)
    expect(charEquals('a', 'á', 'strict')).toBe(false)
    expect(charEquals('A', 'a', 'strict')).toBe(true)
    expect(charEquals('n', 'ñ', 'strict')).toBe(false)
  })

  it('lenient：重音/分音可省，但 ñ 必须打对', () => {
    expect(charEquals('a', 'á', 'lenient')).toBe(true)
    expect(charEquals('u', 'ü', 'lenient')).toBe(true)
    expect(charEquals('n', 'ñ', 'lenient')).toBe(false)
    expect(charEquals('ñ', 'ñ', 'lenient')).toBe(true)
  })

  it('ignore-tilde：连 ñ 也可省', () => {
    expect(charEquals('n', 'ñ', 'ignore-tilde')).toBe(true)
  })

  it('整词语义（用于拼写判定）', () => {
    expect(charEquals('camara', 'cámara', 'lenient')).toBe(true)
    expect(charEquals('niño', 'nino', 'lenient')).toBe(false)
    expect(charEquals('niño', 'nino', 'ignore-tilde')).toBe(true)
  })
})
