import { describe, expect, it } from 'vitest'

import type { Word } from '@/types'

import {
  createInitialState,
  typingReducer,
  type TypingConfig,
  type TypingState,
} from './typingMachine'

const cfg: TypingConfig = { accentMode: 'lenient' }
const w = (name: string): Word => ({ name, trans: ['x'] })

/** 模拟逐键输入：每次按键产生 value = 当前 typed + 新字符 */
function typeChars(
  state: TypingState,
  str: string,
  config: TypingConfig = cfg,
): TypingState {
  let s = state
  for (const ch of str) {
    s = typingReducer(
      s,
      { type: 'UPDATE_INPUT', value: s.typed + ch },
      config,
    )
  }
  return s
}

function input(state: TypingState, value: string, config = cfg): TypingState {
  return typingReducer(state, { type: 'UPDATE_INPUT', value }, config)
}

describe('typingMachine - 基础推进', () => {
  it('打满正确的词后 cursor 前移、typed 清空', () => {
    let s = createInitialState([w('hola'), w('mundo')], cfg)
    s = typeChars(s, 'hola')
    expect(s.cursor).toBe(1)
    expect(s.typed).toBe('')
    expect(s.phase).toBe('active')
    expect(s.wrongNames).toEqual([])
  })

  it('走完最后一个词进入 done 并记录结束时间', () => {
    let s = createInitialState([w('hola')], cfg)
    s = typeChars(s, 'hola')
    expect(s.phase).toBe('done')
    expect(s.finishedAt).not.toBeNull()
  })
})

describe('typingMachine - 打错整词重打', () => {
  it('打错一个字符即锁定，后续追加被忽略', () => {
    let s = createInitialState([w('hola')], cfg)
    s = typeChars(s, 'hx')
    expect(s.errored).toBe(true)
    expect(s.typed).toBe('hx')
    // 继续打字无效
    s = typeChars(s, 'ol')
    expect(s.typed).toBe('hx')
  })

  it('errored 状态下退格一次清空整词并复位', () => {
    let s = createInitialState([w('hola')], cfg)
    s = typeChars(s, 'hx')
    s = input(s, 'h') // 退格
    expect(s.typed).toBe('')
    expect(s.errored).toBe(false)
  })

  it('清空后可重新完整输入', () => {
    let s = createInitialState([w('hola')], cfg)
    s = typeChars(s, 'hx')
    s = input(s, '')
    expect(s.errored).toBe(false)
    s = typeChars(s, 'hola')
    // 整词被正确接受并推进（因出过错，该词被重新入队，故尚未结束）
    expect(s.typed).toBe('')
    expect(s.cursor).toBe(1)
    expect(s.wrongNames).toContain('hola')
  })
})

describe('typingMachine - 错词重新入队', () => {
  it('打错过的词完成后出现在队列尾部，并记入 wrongNames', () => {
    let s = createInitialState([w('a'), w('b')], cfg)
    s = typeChars(s, 'x') // a 打错
    s = input(s, '') // 清空
    s = typeChars(s, 'a') // 正确完成 a
    expect(s.queue.map((x) => x.name)).toEqual(['a', 'b', 'a'])
    expect(s.cursor).toBe(1)
    expect(s.wrongNames).toEqual(['a'])
  })

  it('队列长度不超过 2×baseLength（终止性）', () => {
    let s = createInitialState([w('a')], cfg)
    // 反复：打错 -> 清空 -> 打对
    for (let i = 0; i < 5 && s.phase === 'active'; i++) {
      s = typeChars(s, 'x')
      s = input(s, '')
      s = typeChars(s, 'a')
    }
    expect(s.queue.length).toBeLessThanOrEqual(2)
    expect(s.phase).toBe('done')
  })
})

describe('typingMachine - 重音规则', () => {
  it('lenient：camara 可顶 cámara', () => {
    let s = createInitialState([w('cámara')], cfg)
    s = typeChars(s, 'camara')
    expect(s.phase).toBe('done')
  })

  it('lenient：nino 不能顶 niño', () => {
    let s = createInitialState([w('niño')], cfg)
    s = typeChars(s, 'nino')
    expect(s.errored).toBe(true)
    expect(s.phase).toBe('active')
  })

  it('ignore-tilde：nino 可顶 niño', () => {
    let s = createInitialState([w('niño')], { accentMode: 'ignore-tilde' })
    s = typeChars(s, 'nino', { accentMode: 'ignore-tilde' })
    expect(s.phase).toBe('done')
  })
})

describe('typingMachine - 粘贴逐字校验', () => {
  it('一次性粘贴整词，遇首个不匹配即锁定', () => {
    let s = createInitialState([w('casa')], cfg)
    s = input(s, 'casx')
    expect(s.errored).toBe(true)
    expect(s.typed).toBe('casx')
  })

  it('一次性粘贴正确整词直接完成', () => {
    let s = createInitialState([w('casa')], cfg)
    s = input(s, 'casa')
    expect(s.phase).toBe('done')
  })
})

describe('typingMachine - 重开章节', () => {
  it('RESTART_CHAPTER 回到初始状态', () => {
    let s = createInitialState([w('a'), w('b')], cfg)
    s = typeChars(s, 'x')
    s = typingReducer(s, { type: 'RESTART_CHAPTER' }, cfg)
    expect(s.cursor).toBe(0)
    expect(s.typed).toBe('')
    expect(s.wrongNames).toEqual([])
    expect(s.phase).toBe('active')
  })
})

describe('typingMachine - 空词库', () => {
  it('空章节直接 done', () => {
    const s = createInitialState([], cfg)
    expect(s.phase).toBe('done')
  })
})

describe('typingMachine - 续打恢复', () => {
  const words = [w('a'), w('b'), w('c')]

  it('按下标序列还原队列与 cursor', () => {
    const s = createInitialState(words, cfg, { cursor: 2, queueIdx: [2, 0, 1] })
    expect(s.queue.map((x) => x.name)).toEqual(['c', 'a', 'b'])
    expect(s.cursor).toBe(2)
    expect(s.phase).toBe('active')
    expect(s.baseLength).toBe(3)
  })

  it('续打时忽略 shuffle，严格按记录顺序', () => {
    const s = createInitialState(
      words,
      { accentMode: 'lenient', shuffle: true },
      { cursor: 0, queueIdx: [1, 2, 0] },
    )
    expect(s.queue.map((x) => x.name)).toEqual(['b', 'c', 'a'])
  })

  it('保留「打错重排」的重复词，baseLength 仍为原始长度', () => {
    const s = createInitialState(words, cfg, {
      cursor: 1,
      queueIdx: [0, 1, 2, 0],
    })
    expect(s.queue.map((x) => x.name)).toEqual(['a', 'b', 'c', 'a'])
    expect(s.baseLength).toBe(3)
  })

  it('cursor 越界时收敛到队尾', () => {
    const s = createInitialState(words, cfg, { cursor: 99, queueIdx: [1, 0] })
    expect(s.cursor).toBe(1)
  })

  it('下标越界（词库已变）回退到全新状态', () => {
    const s = createInitialState(words, cfg, { cursor: 1, queueIdx: [0, 9] })
    expect(s.queue.map((x) => x.name)).toEqual(['a', 'b', 'c'])
    expect(s.cursor).toBe(0)
  })

  it('空 queueIdx 回退到全新状态', () => {
    const s = createInitialState(words, cfg, { cursor: 1, queueIdx: [] })
    expect(s.cursor).toBe(0)
    expect(s.queue.map((x) => x.name)).toEqual(['a', 'b', 'c'])
  })
})
