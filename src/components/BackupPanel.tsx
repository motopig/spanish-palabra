import clsx from 'clsx'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { BACKUP_MAX_FILE_BYTES } from '@/constants'
import {
  backupFilename,
  buildBackup,
  mergeCustomDicts,
  mergeProgress,
  parseBackup,
  progressSummary,
} from '@/core/backup'
import { customDictsAtom, progressAtom } from '@/store/progress'
import { settingsAtom } from '@/store/settings'

type Feedback = { kind: 'ok' | 'error'; title: string; issues: string[] }

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function BackupPanel() {
  const progress = useAtomValue(progressAtom)
  const setProgress = useSetAtom(progressAtom)
  const customDicts = useAtomValue(customDictsAtom)
  const setCustomDicts = useSetAtom(customDictsAtom)
  const [settings, setSettings] = useAtom(settingsAtom)

  const fileRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const summary = progressSummary(progress)

  const onExport = () => {
    downloadJSON(
      backupFilename(),
      buildBackup({ progress, customDicts, settings }),
    )
    setFeedback({
      kind: 'ok',
      title: `已导出备份：${summary.chapters} 章已完成 · ${summary.dicts} 个词库有进度`,
      issues: [],
    })
  }

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > BACKUP_MAX_FILE_BYTES) {
      setFeedback({
        kind: 'error',
        title: '导入失败：文件过大',
        issues: [`上限 ${Math.round(BACKUP_MAX_FILE_BYTES / 1024 / 1024)}MB`],
      })
      return
    }
    const { data, issues } = parseBackup(await file.text())
    if (!data) {
      setFeedback({ kind: 'error', title: '导入失败', issues })
      return
    }
    const before = progressSummary(progress)
    const merged = mergeProgress(progress, data.progress)
    setProgress(merged)
    setCustomDicts((prev) => mergeCustomDicts(prev, data.customDicts))
    setSettings(data.settings)
    const added = progressSummary(merged).chapters - before.chapters
    setFeedback({
      kind: 'ok',
      title:
        `已恢复备份：新增 ${added} 章` +
        ` · 自定义词库 ${Object.keys(data.customDicts).length} 个已合并`,
      issues,
    })
  }

  return (
    <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-medium text-slate-500">进度备份</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        进度和自定义词库只保存在本机浏览器，<span className="font-medium text-slate-600">清除缓存或换设备就会丢失</span>。
        导出为文件保存，需要时再导入恢复；导入按并集合并，不会覆盖已有记录。
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onExport}>
          导出进度
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={onImport}
          tabIndex={-1}
          aria-label="选择进度备份文件"
          className="sr-only"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
        >
          导入进度
        </Button>
        <span className="text-xs text-slate-400">
          当前：已完成 {summary.chapters} 章 · {summary.dicts} 个词库
        </span>
      </div>

      {feedback && (
        <div
          className={clsx(
            'mt-3 rounded-lg border px-4 py-3 text-sm',
            feedback.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <span className="font-medium">{feedback.title}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="shrink-0 text-xs text-slate-500 hover:underline"
            >
              关闭
            </button>
          </div>
          {feedback.issues.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs">
              {feedback.issues.slice(0, 10).map((it, i) => (
                <li key={i}>{it}</li>
              ))}
              {feedback.issues.length > 10 && (
                <li>…另有 {feedback.issues.length - 10} 条问题未显示</li>
              )}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
