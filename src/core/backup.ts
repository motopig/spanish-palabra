import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '@/constants'
import type {
  CustomDictMap,
  Dictionary,
  ProgressMap,
  Settings,
} from '@/types'

/** 备份文件标识，用于识别导入的文件是不是本应用导出的 */
export const BACKUP_KIND = 'palabras-backup'

export type BackupData = {
  kind: typeof BACKUP_KIND
  /** 导出时的 SCHEMA_VERSION */
  version: number
  /** ISO 时间戳 */
  exportedAt: string
  progress: ProgressMap
  customDicts: CustomDictMap
  settings: Settings
}

export type BackupParseResult = {
  data: BackupData | null
  issues: string[]
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export function buildBackup(input: {
  progress: ProgressMap
  customDicts: CustomDictMap
  settings: Settings
  now?: Date
}): BackupData {
  return {
    kind: BACKUP_KIND,
    version: SCHEMA_VERSION,
    exportedAt: (input.now ?? new Date()).toISOString(),
    progress: input.progress,
    customDicts: input.customDicts,
    settings: input.settings,
  }
}

export function backupFilename(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp =
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `-${p(now.getHours())}${p(now.getMinutes())}`
  return `palabras-backup-${stamp}.json`
}

const SETTING_VALIDATORS: Record<keyof Settings, (v: unknown) => boolean> = {
  accentMode: (v) => v === 'strict' || v === 'lenient' || v === 'ignore-tilde',
  dictationMode: (v) =>
    v === 'none' ||
    v === 'hideAll' ||
    v === 'hideVowel' ||
    v === 'hideConsonant' ||
    v === 'randomHide',
  fontSize: (v) => typeof v === 'number' && Number.isFinite(v),
  shuffle: (v) => typeof v === 'boolean',
  autoSpeak: (v) => typeof v === 'boolean',
  speechRate: (v) => typeof v === 'number' && Number.isFinite(v),
  voiceURI: (v) => v === null || typeof v === 'string',
}

function sanitizeProgress(raw: unknown, issues: string[]): ProgressMap {
  if (!isRecord(raw)) return {}
  const out: ProgressMap = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!isRecord(value) || !Array.isArray(value.done)) {
      issues.push(`忽略无效的进度记录：${id}`)
      continue
    }
    const done = [
      ...new Set(
        value.done.filter(
          (n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0,
        ),
      ),
    ].sort((a, b) => a - b)
    const lastChapter =
      typeof value.lastChapter === 'number'
        ? value.lastChapter
        : (done[done.length - 1] ?? 0)
    const updatedAt = typeof value.updatedAt === 'number' ? value.updatedAt : 0
    out[id] = { done, lastChapter, updatedAt }
  }
  return out
}

function sanitizeCustomDicts(raw: unknown, issues: string[]): CustomDictMap {
  if (!isRecord(raw)) return {}
  const out: CustomDictMap = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!isRecord(value) || typeof value.id !== 'string' || !Array.isArray(value.words)) {
      issues.push(`忽略无效的自定义词库：${id}`)
      continue
    }
    out[id] = value as unknown as Dictionary
  }
  return out
}

function sanitizeSettings(raw: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS }
  if (!isRecord(raw)) return out
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = raw[key]
    if (value !== undefined && SETTING_VALIDATORS[key](value)) {
      out[key] = value as never
    }
  }
  return out
}

/**
 * 解析备份文件。任何结构性错误都收敛为 issues，不抛错；
 * 返回 data=null 表示整个文件不可用。
 */
export function parseBackup(text: string): BackupParseResult {
  const issues: string[] = []
  let raw: unknown
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch {
    return { data: null, issues: ['文件不是有效的 JSON'] }
  }
  if (!isRecord(raw)) {
    return { data: null, issues: ['备份文件内容格式不正确'] }
  }
  if (raw.kind !== BACKUP_KIND) {
    return { data: null, issues: ['这不是 Palabras 的进度备份文件'] }
  }
  const version = typeof raw.version === 'number' ? raw.version : 0
  if (version > SCHEMA_VERSION) {
    return {
      data: null,
      issues: [
        `备份文件版本 v${version} 高于当前应用（v${SCHEMA_VERSION}），请先更新后再导入`,
      ],
    }
  }

  return {
    data: {
      kind: BACKUP_KIND,
      version,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      progress: sanitizeProgress(raw.progress, issues),
      customDicts: sanitizeCustomDicts(raw.customDicts, issues),
      settings: sanitizeSettings(raw.settings),
    },
    issues,
  }
}

/** 进度取并集：不覆盖已有完成记录，updatedAt 取较大者 */
export function mergeProgress(a: ProgressMap, b: ProgressMap): ProgressMap {
  const out: ProgressMap = { ...a }
  for (const [id, incoming] of Object.entries(b)) {
    const current = out[id]
    if (!current) {
      out[id] = incoming
      continue
    }
    const done = [...new Set([...current.done, ...incoming.done])].sort(
      (x, y) => x - y,
    )
    const newer =
      incoming.updatedAt >= current.updatedAt ? incoming : current
    out[id] = {
      done,
      lastChapter: newer.lastChapter,
      updatedAt: Math.max(current.updatedAt, incoming.updatedAt),
    }
  }
  return out
}

/** 自定义词库按 id 合并，导入的同 id 以导入内容为准 */
export function mergeCustomDicts(
  a: CustomDictMap,
  b: CustomDictMap,
): CustomDictMap {
  return { ...a, ...b }
}

export function progressSummary(progress: ProgressMap): {
  chapters: number
  dicts: number
} {
  let chapters = 0
  let dicts = 0
  for (const entry of Object.values(progress)) {
    if (entry.done.length > 0) {
      dicts += 1
      chapters += entry.done.length
    }
  }
  return { chapters, dicts }
}
