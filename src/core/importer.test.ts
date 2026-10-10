import { describe, expect, it } from 'vitest'

import { buildCustomDict, parseImport, stripBom, toWord } from './importer'

describe('stripBom', () => {
  it('剥掉 UTF-8 BOM', () => {
    expect(stripBom('\ufeffhola')).toBe('hola')
    expect(stripBom('hola')).toBe('hola')
  })
})

describe('toWord', () => {
  it('兼容 qwerty-learner 的 usphone/notation 字段', () => {
    const w = toWord({ word: 'cámara', usphone: 'ˈkæmərə', trans: '相机' })
    expect(w?.name).toBe('cámara')
    expect(w?.phonetic).toBe('ˈkæmərə')
    expect(w?.trans).toEqual(['相机'])
  })

  it('trans 支持数组与分隔符字符串', () => {
    expect(toWord({ name: 'a', trans: ['x', 'y'] })?.trans).toEqual(['x', 'y'])
    expect(toWord({ name: 'a', trans: 'x；y;z|w' })?.trans).toEqual([
      'x',
      'y',
      'z',
      'w',
    ])
  })

  it('去除音标两侧的斜杠', () => {
    expect(toWord({ name: 'a', trans: 'x', phonetic: '/ˈola/' })?.phonetic).toBe(
      'ˈola',
    )
  })

  it('缺 name 返回 null', () => {
    expect(toWord({ trans: 'x' })).toBeNull()
  })
})

describe('parseImport JSON', () => {
  it('解析 { words: [] } 结构', () => {
    const { words, issues } = parseImport(
      JSON.stringify({ words: [{ name: 'hola', trans: '你好' }] }),
      'a.json',
    )
    expect(issues).toHaveLength(0)
    expect(words).toHaveLength(1)
    expect(words[0].name).toBe('hola')
  })

  it('解析裸数组', () => {
    const { words } = parseImport('[{"name":"sol","trans":"太阳"}]', 'a.json')
    expect(words.map((w) => w.name)).toEqual(['sol'])
  })

  it('坏 JSON 报错不抛异常', () => {
    const { words, issues } = parseImport('{ not json', 'a.json')
    expect(words).toHaveLength(0)
    expect(issues[0].message).toContain('JSON')
  })

  it('含中文字符的单词被拒', () => {
    const { words, issues } = parseImport(
      JSON.stringify([{ name: '你好', trans: 'x' }]),
      'a.json',
    )
    expect(words).toHaveLength(0)
    expect(issues[0].message).toContain('中文')
  })

  it('缺释义被拒', () => {
    const { words, issues } = parseImport(
      JSON.stringify([{ name: 'hola' }]),
      'a.json',
    )
    expect(words).toHaveLength(0)
    expect(issues[0].message).toContain('释义')
  })

  it('按 foldAccents 去重（重音不同视为同一词）', () => {
    const { words } = parseImport(
      JSON.stringify([
        { name: 'cámara', trans: '相机' },
        { name: 'camara', trans: '重复' },
      ]),
      'a.json',
    )
    expect(words).toHaveLength(1)
    expect(words[0].trans).toEqual(['相机'])
  })
})

describe('parseImport CSV', () => {
  it('带表头解析', () => {
    const csv = 'name,trans,phonetic,pos\nhola,你好,ˈola,interj.\nsol,太阳,ˈsol,n.m.'
    const { words, issues } = parseImport(csv, 'a.csv')
    expect(issues).toHaveLength(0)
    expect(words).toHaveLength(2)
    expect(words[0]).toMatchObject({ name: 'hola', phonetic: 'ˈola', pos: 'interj.' })
  })

  it('无表头按位置解析', () => {
    const { words } = parseImport('hola,你好,ˈola', 'a.csv')
    expect(words[0]).toMatchObject({ name: 'hola', phonetic: 'ˈola' })
  })

  it('支持引号包裹与转义引号', () => {
    // 引号内的逗号属于同一字段（不当作释义分隔符）
    const csv = 'name,trans\nhola,"你好, 喂"\nsol,"太阳；恒星"'
    const { words } = parseImport(csv, 'a.csv')
    expect(words[0].trans).toEqual(['你好, 喂'])
    expect(words[1].trans).toEqual(['太阳', '恒星'])
  })

  it('引号内的转义引号还原', () => {
    const { words } = parseImport('name,trans\nsol,"太阳 ""sol"""', 'a.csv')
    expect(words[0].trans).toEqual(['太阳 "sol"'])
  })

  it('带 BOM 的 CSV 正常解析', () => {
    const { words } = parseImport('\ufeffname,trans\nhola,你好', 'a.csv')
    expect(words).toHaveLength(1)
  })

  it('错误行收集行号，不中断其他行', () => {
    const csv = 'name,trans\nhola,你好\n,x\nsol,太阳'
    const { words, issues } = parseImport(csv, 'a.csv')
    expect(words.map((w) => w.name)).toEqual(['hola', 'sol'])
    expect(issues).toHaveLength(1)
    expect(issues[0].line).toBe(3)
  })
})

describe('buildCustomDict', () => {
  it('由文件名生成元信息且 wordCount 自洽', () => {
    const dict = buildCustomDict('我的词表.csv', [{ name: 'hola', trans: ['你好'] }])
    expect(dict.name).toBe('我的词表')
    expect(dict.custom).toBe(true)
    expect(dict.wordCount).toBe(1)
    expect(dict.words).toHaveLength(1)
  })
})
