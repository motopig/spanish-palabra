import clsx from 'clsx'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

import { BackupPanel } from '@/components/BackupPanel'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/Button'
import { calcChapterCount } from '@/core/chapter'
import {
  buildCustomDict,
  importFile,
  type ImportIssue,
} from '@/core/importer'
import { useDictList } from '@/hooks/useDictionary'
import { customDictsAtom, progressAtom } from '@/store/progress'
import { currentChapterAtom, currentDictIdAtom, pageAtom } from '@/store/session'

type Feedback = { kind: 'ok' | 'error'; title: string; issues: ImportIssue[] }

export function Gallery() {
  const { list, loading, error } = useDictList()
  const [dictId, setDictId] = useAtom(currentDictIdAtom)
  const [, setChapter] = useAtom(currentChapterAtom)
  const [, setPage] = useAtom(pageAtom)
  const setCustomDicts = useSetAtom(customDictsAtom)
  const progress = useAtomValue(progressAtom)

  const fileRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const selected = useMemo(
    () => list.find((d) => d.id === dictId) ?? list[0],
    [list, dictId],
  )

  const chapterCount = selected ? calcChapterCount(selected.wordCount) : 0
  const doneSet = new Set(progress[selected?.id ?? '']?.done ?? [])

  const startChapter = (chapter: number) => {
    if (!selected) return
    setDictId(selected.id)
    setChapter(chapter)
    setPage('typing')
  }

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const result = await importFile(file)
    if (result.words.length === 0) {
      setFeedback({ kind: 'error', title: '导入失败', issues: result.issues })
      return
    }
    const dict = buildCustomDict(file.name, result.words)
    setCustomDicts((prev) => ({ ...prev, [dict.id]: dict }))
    setDictId(dict.id)
    setFeedback({
      kind: 'ok',
      title: `已导入《${dict.name}》共 ${dict.words.length} 词`,
      issues: result.issues,
    })
  }

  const removeCustom = (id: string) => {
    setCustomDicts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (dictId === id) setDictId('es-core')
  }

  return (
    <div className="min-h-full">
      <Header
        title="Palabras"
        subtitle="西班牙语单词记忆 · 打字练习"
        right={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.csv,text/csv,application/json"
              onChange={onPickFile}
              tabIndex={-1}
              aria-label="选择词库文件"
              className="sr-only"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              导入词库
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading && <p className="text-slate-500">加载词库中…</p>}
        {error && (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-rose-600">
            {error}
          </p>
        )}

        {feedback && (
          <div
            className={clsx(
              'mb-6 rounded-lg border px-4 py-3 text-sm',
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
                  <li key={i}>
                    {it.line > 0 ? `第 ${it.line} 行：` : ''}
                    {it.message}
                  </li>
                ))}
                {feedback.issues.length > 10 && (
                  <li>…另有 {feedback.issues.length - 10} 条问题未显示</li>
                )}
              </ul>
            )}
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-medium text-slate-500">选择词库</h2>
              <div className="flex flex-wrap gap-2">
                {list.map((d) => (
                  <div
                    key={d.id}
                    className={clsx(
                      'relative rounded-lg border transition-colors',
                      d.id === selected?.id
                        ? 'border-brand bg-brand/5'
                        : 'border-slate-200 bg-white hover:border-slate-300',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setDictId(d.id)}
                      className="block w-full px-4 py-3 pr-8 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {d.name}
                        </span>
                        {d.custom && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                            自定义
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {d.wordCount} 词 · {calcChapterCount(d.wordCount)} 章
                      </div>
                    </button>
                    {d.custom && (
                      <button
                        type="button"
                        title="删除该词库"
                        onClick={() => removeCustom(d.id)}
                        className="absolute right-1.5 top-1.5 rounded px-1.5 text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {selected && (
              <section>
                <div className="mb-4 flex items-baseline justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {selected.name}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {selected.description}
                    </p>
                  </div>
                  <Button onClick={() => startChapter(0)}>从第 1 章开始</Button>
                </div>

                <div className="grid grid-cols-5 gap-3 sm:grid-cols-8 md:grid-cols-10">
                  {Array.from({ length: chapterCount }, (_, i) => {
                    const done = doneSet.has(i)
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => startChapter(i)}
                        className={clsx(
                          'relative aspect-square rounded-lg border text-sm font-medium transition-colors',
                          done
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand',
                        )}
                      >
                        {i + 1}
                        {done && (
                          <span className="absolute right-1 top-1 text-[10px]">
                            ✓
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            <BackupPanel />
          </>
        )}
      </main>
    </div>
  )
}
