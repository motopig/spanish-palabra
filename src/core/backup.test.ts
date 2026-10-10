import { describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '@/constants'
import type { CustomDictMap, ProgressMap, Settings } from '@/types'

import {
  BACKUP_KIND,
  backupFilename,
  buildBackup,
  mergeCustomDicts,
  mergeProgress,
  parseBackup,
  progressSummary,
} from './backup'

const settings: Settings = { ...DEFAULT_SETTINGS, accentMode: 'strict', fontSize: 64 }

const dict: CustomDictMap = {
  'custom-x-1': {
    id: 'custom-x-1',
    name: '我的词库',
    description: '',
    category: 'custom',
    tags: [],
    language: 'es',
    languageCategory: 'es-ES',
    wordCount: 1,
    file: 'inline',
    custom: true,
    words: [{ name: 'casa', trans: ['房子'] }],
  },
}

describe('buildBackup / backupFilename', () => {
  it('带上 kind、version 与 ISO 时间戳', () => {
    const now = new Date('2026-10-10T08:09:00Z')
    const backup = buildBackup({
      progress: {},
      customDicts: {},
      settings,
      now,
    })
    expect(backup.kind).toBe(BACKUP_KIND)
    expect(backup.version).toBe(SCHEMA_VERSION)
    expect(backup.exportedAt).toBe(now.toISOString())
  })

  it('文件名含本地日期时间', () => {
    const name = backupFilename(new Date(2026, 9, 10, 8, 9))
    expect(name).toBe('palabras-backup-20261010-0809.json')
  })
})

describe('parseBackup', () => {
  it('往返：导出再解析得到等价数据', () => {
    const progress: ProgressMap = {
      'es-core': { done: [1, 2], lastChapter: 2, updatedAt: 111 },
    }
    const backup = buildBackup({ progress, customDicts: dict, settings })
    const { data, issues } = parseBackup(JSON.stringify(backup))
    expect(issues).toEqual([])
    expect(data?.progress).toEqual(progress)
    expect(data?.settings).toEqual(settings)
    expect(Object.keys(data?.customDicts ?? {})).toEqual(['custom-x-1'])
  })

  it('剥 BOM 后仍可解析', () => {
    const backup = buildBackup({ progress: {}, customDicts: {}, settings })
    const { data } = parseBackup('\uFEFF' + JSON.stringify(backup))
    expect(data).not.toBeNull()
  })

  it('非 JSON 直接失败', () => {
    expect(parseBackup('not json').data).toBeNull()
    expect(parseBackup('not json').issues[0]).toMatch(/JSON/)
  })

  it('拒绝非本应用的 JSON', () => {
    const { data, issues } = parseBackup('{"words":[]}')
    expect(data).toBeNull()
    expect(issues[0]).toMatch(/不是 Palabras/)
  })

  it('版本高于当前应用时拒绝', () => {
    const { data, issues } = parseBackup(
      JSON.stringify({ kind: BACKUP_KIND, version: SCHEMA_VERSION + 1 }),
    )
    expect(data).toBeNull()
    expect(issues[0]).toMatch(/高于当前应用/)
  })

  it('丢弃无效进度记录并记录 issue', () => {
    const text = JSON.stringify({
      kind: BACKUP_KIND,
      version: SCHEMA_VERSION,
      progress: {
        good: { done: [0, 0, 1], updatedAt: 5 },
        bad: { done: 'nope' },
      },
      customDicts: {},
      settings: {},
    })
    const { data, issues } = parseBackup(text)
    expect(data?.progress.good.done).toEqual([0, 1])
    expect(data?.progress).not.toHaveProperty('bad')
    expect(issues[0]).toMatch(/忽略无效的进度记录/)
  })

  it('设置项做类型消毒：非法枚举/未知键被丢弃，合法 voiceURI 保留', () => {
    const text = JSON.stringify({
      kind: BACKUP_KIND,
      version: SCHEMA_VERSION,
      progress: {},
      customDicts: {},
      settings: { accentMode: 'bogus', fontSize: 60, voiceURI: 'x:y', nope: 1 },
    })
    const { data } = parseBackup(text)
    expect(data?.settings.accentMode).toBe(DEFAULT_SETTINGS.accentMode)
    expect(data?.settings.fontSize).toBe(60)
    expect(data?.settings.voiceURI).toBe('x:y')
    expect(data?.settings).not.toHaveProperty('nope')
  })
})

describe('mergeProgress', () => {
  it('取并集、排序，不覆盖已有完成记录', () => {
    const a: ProgressMap = {
      d: { done: [1, 3], lastChapter: 3, updatedAt: 100 },
    }
    const b: ProgressMap = {
      d: { done: [2, 3], lastChapter: 2, updatedAt: 50 },
      e: { done: [7], lastChapter: 7, updatedAt: 10 },
    }
    const merged = mergeProgress(a, b)
    expect(merged.d.done).toEqual([1, 2, 3])
    // updatedAt 较大的一方（a）胜出
    expect(merged.d.lastChapter).toBe(3)
    expect(merged.d.updatedAt).toBe(100)
    expect(merged.e.done).toEqual([7])
  })

  it('导入较新时采用导入的 lastChapter', () => {
    const merged = mergeProgress(
      { d: { done: [1], lastChapter: 1, updatedAt: 1 } },
      { d: { done: [5], lastChapter: 5, updatedAt: 9 } },
    )
    expect(merged.d.lastChapter).toBe(5)
  })
})

describe('mergeCustomDicts / progressSummary', () => {
  it('按 id 合并，导入内容覆盖同 id', () => {
    const merged = mergeCustomDicts(
      { a: { ...dict['custom-x-1'], id: 'a' } },
      { b: { ...dict['custom-x-1'], id: 'b' } },
    )
    expect(Object.keys(merged).sort()).toEqual(['a', 'b'])
  })

  it('只统计有完成章节的词库', () => {
    expect(
      progressSummary({
        x: { done: [1, 2], lastChapter: 2, updatedAt: 0 },
        y: { done: [], lastChapter: 0, updatedAt: 0 },
      }),
    ).toEqual({ chapters: 2, dicts: 1 })
  })
})
