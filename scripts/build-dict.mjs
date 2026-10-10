// @ts-check
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const OUT_DIR = join(root, 'public', 'dicts')

/**
 * 词库清单。wordCount / file 由脚本计算，绝不手写。
 * src 为相对 scripts/ 的 TSV 路径（Tab 分隔：name ⇥ trans ⇥ phonetic ⇥ pos）。
 * es-core 人工维护；cefr/* 由 import-cefr.mjs 从上游生成。
 * @type {Array<{ id: string, name: string, description: string, category: string, tags: string[], language: 'es', languageCategory: string, src: string }>}
 */
const DICTS = [
  {
    id: 'es-core',
    name: '西班牙语核心词',
    description: '约 250 个最常用的西班牙语高频词，含 IPA 音标、词性与中文释义',
    category: 'es-core',
    tags: ['core', 'beginner'],
    language: 'es',
    languageCategory: 'es-ES',
    src: 'es-core.tsv',
  },
  {
    id: 'es-a1',
    name: '西班牙语 A1',
    description: 'CEFR A1 级高频词 1000 个 · 中文释义 + 词性',
    category: 'cefr',
    tags: ['cefr', 'a1', 'beginner'],
    language: 'es',
    languageCategory: 'es-ES',
    src: 'cefr/es-a1.tsv',
  },
  {
    id: 'es-a2',
    name: '西班牙语 A2',
    description: 'CEFR A2 级高频词 1000 个 · 中文释义 + 词性',
    category: 'cefr',
    tags: ['cefr', 'a2', 'beginner'],
    language: 'es',
    languageCategory: 'es-ES',
    src: 'cefr/es-a2.tsv',
  },
  {
    id: 'es-b1',
    name: '西班牙语 B1',
    description: 'CEFR B1 级高频词 1000 个 · 中文释义 + 词性',
    category: 'cefr',
    tags: ['cefr', 'b1', 'intermediate'],
    language: 'es',
    languageCategory: 'es-ES',
    src: 'cefr/es-b1.tsv',
  },
  {
    id: 'es-b2',
    name: '西班牙语 B2',
    description: 'CEFR B2 级高频词 1000 个 · 中文释义 + 词性',
    category: 'cefr',
    tags: ['cefr', 'b2', 'intermediate'],
    language: 'es',
    languageCategory: 'es-ES',
    src: 'cefr/es-b2.tsv',
  },
  {
    id: 'es-c1',
    name: '西班牙语 C1',
    description: 'CEFR C1 级高频词 1000 个 · 中文释义 + 词性',
    category: 'cefr',
    tags: ['cefr', 'c1', 'advanced'],
    language: 'es',
    languageCategory: 'es-ES',
    src: 'cefr/es-c1.tsv',
  },
]

const CJK = /[\u3040-\u9fff\uff00-\uffef]/

/**
 * 解析 TSV。以 # 开头的行视为注释。
 * @returns {{ words: Array<{name:string, trans:string[], phonetic?:string, pos?:string}>, errors: string[] }}
 */
function parseTsv(text) {
  const words = []
  const errors = []
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)

  lines.forEach((line, i) => {
    if (!line.trim() || line.startsWith('#')) return
    const lineNo = i + 1
    const cols = line.split('\t')
    const name = (cols[0] ?? '').normalize('NFC').trim()
    const transRaw = (cols[1] ?? '').trim()
    const phonetic = (cols[2] ?? '').trim() || undefined
    const pos = (cols[3] ?? '').trim() || undefined

    if (!name) return errors.push(`L${lineNo}: 缺少单词`)
    if (name.length > 64) return errors.push(`L${lineNo}: 单词过长 "${name}"`)
    if (CJK.test(name)) return errors.push(`L${lineNo}: 单词含 CJK 字符 "${name}"`)
    if (!transRaw) return errors.push(`L${lineNo}: 缺少释义 "${name}"`)

    const trans = transRaw
      .split(/[；;|]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!trans.length) return errors.push(`L${lineNo}: 释义为空 "${name}"`)

    words.push({
      name,
      trans,
      ...(phonetic ? { phonetic } : {}),
      ...(pos ? { pos } : {}),
    })
  })

  return { words, errors }
}

/** 按 NFC 精确去重：重音对立的词（si/sí、el/él）是不同词，必须都保留 */
function dedupe(words, errors) {
  const seen = new Set()
  const out = []
  for (const w of words) {
    if (seen.has(w.name)) {
      errors.push(`重复词已跳过: "${w.name}"`)
      continue
    }
    seen.add(w.name)
    out.push(w)
  }
  return out
}

mkdirSync(OUT_DIR, { recursive: true })

const index = []
let totalErrors = 0

for (const dict of DICTS) {
  const srcPath = join(here, dict.src)
  const { words: parsed, errors } = parseTsv(readFileSync(srcPath, 'utf8'))
  const words = dedupe(parsed, errors)

  if (errors.length) {
    totalErrors += errors.length
    console.warn(`⚠ ${dict.id} 校验警告 (${errors.length}):`)
    for (const e of errors.slice(0, 10)) console.warn('  -', e)
    if (errors.length > 10) console.warn(`  …另有 ${errors.length - 10} 条`)
  }
  if (!words.length) {
    console.error(`✗ ${dict.id}: 没有生成任何词条`)
    process.exit(1)
  }

  const { src: _src, ...meta } = dict
  writeFileSync(
    join(OUT_DIR, `${dict.id}.json`),
    JSON.stringify({ ...meta, words }, null, 2) + '\n',
  )
  index.push({ ...meta, wordCount: words.length, file: `/dicts/${dict.id}.json` })
  console.log(`✓ ${dict.id}: ${words.length} 词 -> public/dicts/${dict.id}.json`)
}

writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n')
const total = index.reduce((s, d) => s + d.wordCount, 0)
console.log(`✓ index.json：${index.length} 个词库 / 共 ${total} 词`)
if (totalErrors) console.warn(`⚠ 共 ${totalErrors} 条校验警告`)
