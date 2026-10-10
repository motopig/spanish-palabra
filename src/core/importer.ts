import { IMPORT_MAX_FILE_BYTES, IMPORT_MAX_WORDS } from '@/constants'
import type { Dictionary, Word } from '@/types'

import { foldAccents, normalizeNFC } from './text'

export type ImportIssue = { line: number; message: string }

export type ImportResult = {
  words: Word[]
  issues: ImportIssue[]
}

const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
const TRANS_SPLIT = /[；;|、/]/

/** 去掉 UTF-8 BOM（Excel 导出的 CSV 常见） */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/** 极简 CSV 切分：支持表头、双引号包裹字段、"" 转义与字段内换行 */
function splitCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  const endField = () => {
    row.push(field)
    field = ''
  }
  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }

  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === ',') {
      endField()
      i++
      continue
    }
    if (ch === '\r') {
      if (text[i + 1] === '\n') i++
      endRow()
      i++
      continue
    }
    if (ch === '\n') {
      endRow()
      i++
      continue
    }
    field += ch
    i++
  }
  if (field.length > 0 || row.length > 0) endRow()

  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

const HEADER_ALIASES: Record<string, keyof Word | 'trans'> = {
  name: 'name',
  word: 'name',
  palabra: 'name',
  单词: 'name',
  trans: 'trans',
  translation: 'trans',
  meaning: 'trans',
  significado: 'trans',
  释义: 'trans',
  翻译: 'trans',
  phonetic: 'phonetic',
  ipa: 'phonetic',
  phone: 'phonetic',
  notation: 'phonetic',
  usphone: 'phonetic',
  ukphone: 'phonetic',
  音标: 'phonetic',
  pos: 'pos',
  partofspeech: 'pos',
  词性: 'pos',
  example: 'example',
  sentence: 'example',
  例句: 'example',
}

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_-]/g, '')
}

function parseTrans(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean)
  }
  if (typeof raw === 'string') {
    return raw
      .split(TRANS_SPLIT)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

/** 兼容 qwerty-learner 及本项目的词条形状 */
export function toWord(raw: Record<string, unknown>): Word | null {
  const name = raw.name ?? raw.word ?? raw.palabra
  if (typeof name !== 'string') return null

  const trans = parseTrans(raw.trans ?? raw.translation ?? raw.meaning)
  const phonetic = [raw.phonetic, raw.ipa, raw.notation, raw.usphone, raw.ukphone]
    .find((v) => typeof v === 'string' && v.trim() !== '') as string | undefined
  const pos =
    typeof raw.pos === 'string'
      ? raw.pos
      : typeof raw.partOfSpeech === 'string'
        ? raw.partOfSpeech
        : undefined
  const example =
    typeof raw.example === 'string' ? raw.example : undefined

  return {
    name: normalizeNFC(name.trim()),
    trans,
    ...(phonetic ? { phonetic: phonetic.trim().replace(/^\/|\/$/g, '') } : {}),
    ...(pos && pos.trim() ? { pos: pos.trim() } : {}),
    ...(example && example.trim() ? { example: example.trim() } : {}),
  }
}

function validate(word: Word | null, line: number): ImportIssue | null {
  if (!word) return { line, message: '缺少单词字段（name / word）' }
  if (!word.name) return { line, message: '单词为空' }
  if (word.name.length > 64) return { line, message: '单词过长（>64 字符）' }
  if (CJK.test(word.name))
    return { line, message: `"${word.name}" 含中文字符，应为西语单词` }
  if (word.trans.length === 0) return { line, message: `"${word.name}" 缺少释义` }
  return null
}

function fromJson(text: string): { rows: Record<string, unknown>[]; issue?: string } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { rows: [], issue: 'JSON 解析失败，请检查格式' }
  }
  if (Array.isArray(data)) return { rows: data as Record<string, unknown>[] }
  if (data && typeof data === 'object' && 'words' in data) {
    const words = (data as { words: unknown }).words
    if (Array.isArray(words)) return { rows: words as Record<string, unknown>[] }
  }
  return { rows: [], issue: 'JSON 需为数组或 { "words": [...] } 结构' }
}

function csvToRecords(rows: string[][]): Record<string, unknown>[] {
  const first = rows[0].map(normalizeKey)
  const hasHeader = first.some((k) => k in HEADER_ALIASES)
  const body = hasHeader ? rows.slice(1) : rows

  const keys: (keyof Word | 'trans')[] = hasHeader
    ? first.map((k) => HEADER_ALIASES[k] ?? 'name')
    : ['name', 'trans', 'phonetic', 'pos', 'example']

  return body.map((r) => {
    const rec: Record<string, unknown> = {}
    keys.forEach((key, i) => {
      if (r[i] !== undefined && rec[key] === undefined) rec[key] = r[i]
    })
    return rec
  })
}

/**
 * 解析自定义词库文本。支持 JSON（数组或 { words: [] }）与 CSV。
 * 逐条校验并收集问题，去重按 foldAccents。
 */
export function parseImport(text: string, filename = ''): ImportResult {
  const clean = stripBom(text).trim()
  const issues: ImportIssue[] = []

  const isJson =
    filename.toLowerCase().endsWith('.json') ||
    clean.startsWith('{') ||
    clean.startsWith('[')

  let records: Record<string, unknown>[]
  if (isJson) {
    const { rows, issue } = fromJson(clean)
    if (issue) return { words: [], issues: [{ line: 0, message: issue }] }
    records = rows
  } else {
    records = csvToRecords(splitCsv(clean))
  }

  if (records.length === 0) {
    return { words: [], issues: [{ line: 0, message: '未解析到任何词条' }] }
  }

  const words: Word[] = []
  const seen = new Set<string>()

  records.forEach((rec, idx) => {
    const line = idx + (isJson ? 1 : 2) // 1-based，CSV 额外跳过表头
    const word = toWord(rec)
    const issue = validate(word, line)
    if (issue) {
      issues.push(issue)
      return
    }
    const w = word as Word
    const key = foldAccents(w.name)
    if (seen.has(key)) return // 静默去重
    seen.add(key)
    words.push(w)
  })

  return { words, issues }
}

/** 读取并解析用户选择的文件，含体积与数量上限校验 */
export async function importFile(file: File): Promise<ImportResult> {
  if (file.size > IMPORT_MAX_FILE_BYTES) {
    return {
      words: [],
      issues: [
        {
          line: 0,
          message: `文件过大（${(file.size / 1024 / 1024).toFixed(1)} MB），上限 2 MB`,
        },
      ],
    }
  }
  const text = await file.text()
  const result = parseImport(text, file.name)
  if (result.words.length > IMPORT_MAX_WORDS) {
    return {
      words: result.words.slice(0, IMPORT_MAX_WORDS),
      issues: [
        ...result.issues,
        {
          line: 0,
          message: `词条超过 ${IMPORT_MAX_WORDS} 条，仅保留前 ${IMPORT_MAX_WORDS} 条`,
        },
      ],
    }
  }
  return result
}

/** 由文件名生成自定义词库（id 带时间戳后缀，避免重名覆盖） */
export function buildCustomDict(filename: string, words: Word[]): Dictionary {
  const base = filename.replace(/\.[^.]+$/, '').trim() || '自定义词库'
  const slug =
    foldAccents(base)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'dict'
  const id = `custom-${slug}-${Date.now().toString(36)}`
  return {
    id,
    name: base,
    description: `导入的自定义词库 · ${words.length} 词`,
    category: 'custom',
    tags: ['custom'],
    language: 'es',
    languageCategory: 'custom',
    wordCount: words.length,
    file: 'inline',
    custom: true,
    words,
  }
}
