import { normalizeNFC } from '@/core/text'
import type { CustomDictMap, Dictionary, DictionaryMeta, Word } from '@/types'

/** 解析相对 BASE_URL 的公共资源路径，兼容部署到子路径 */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}${path.replace(/^\//, '')}`
}

let indexCache: DictionaryMeta[] | null = null
const wordsCache = new Map<string, Word[]>()

export async function loadDictIndex(): Promise<DictionaryMeta[]> {
  if (indexCache) return indexCache
  const res = await fetch(publicUrl('dicts/index.json'))
  if (!res.ok) throw new Error(`加载词库索引失败 (${res.status})`)
  const list = (await res.json()) as DictionaryMeta[]
  indexCache = list
  return list
}

export async function loadDictWords(file: string): Promise<Word[]> {
  const cached = wordsCache.get(file)
  if (cached) return cached
  const res = await fetch(publicUrl(file))
  if (!res.ok) throw new Error(`加载词库失败 (${res.status})`)
  const data = (await res.json()) as { words: Word[] }
  const words = (data.words ?? []).map(normalizeWord)
  wordsCache.set(file, words)
  return words
}

function normalizeWord(w: Word): Word {
  return { ...w, name: normalizeNFC(w.name) }
}

/** 内置词库元信息 + 自定义词库（自定义置顶） */
export function mergeDictList(
  index: DictionaryMeta[],
  custom: CustomDictMap,
): DictionaryMeta[] {
  const customs = Object.values(custom).map(
    ({ words: _words, ...meta }): DictionaryMeta => meta,
  )
  return [...customs, ...index]
}

export function findMeta(
  list: DictionaryMeta[],
  id: string,
): DictionaryMeta | undefined {
  return list.find((d) => d.id === id)
}

/** 组合出完整 Dictionary（元信息 + 词表） */
export async function loadDictionary(
  meta: DictionaryMeta,
  custom: CustomDictMap,
): Promise<Dictionary> {
  const words = meta.custom
    ? (custom[meta.id]?.words ?? [])
    : await loadDictWords(meta.file)
  return { ...meta, words }
}
