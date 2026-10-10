import { useAtom, useAtomValue } from 'jotai'

import { Header } from '@/components/Header'
import { Button } from '@/components/ui/Button'
import { calcChapterCount } from '@/core/chapter'
import { useDictList } from '@/hooks/useDictionary'
import { lastResultAtom } from '@/store/result'
import { currentChapterAtom, pageAtom } from '@/store/session'

function formatTime(ms: number): string {
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function Result() {
  const result = useAtomValue(lastResultAtom)
  const { list } = useDictList()
  const [, setChapter] = useAtom(currentChapterAtom)
  const [, setPage] = useAtom(pageAtom)

  if (!result) {
    return (
      <div className="min-h-full">
        <Header title="结果" />
        <div className="flex min-h-[60vh] items-center justify-center gap-4 px-6 text-slate-500">
          暂无结果
          <Button variant="outline" onClick={() => setPage('gallery')}>
            返回词库
          </Button>
        </div>
      </div>
    )
  }

  const { summary, wrongNames, chapter, dictName, dictId } = result
  const meta = list.find((d) => d.id === dictId)
  const chapterCount = meta ? calcChapterCount(meta.wordCount) : 0
  const hasNext = chapter + 1 < chapterCount

  return (
    <div className="min-h-full">
      <Header title="本章完成" subtitle={`${dictName} · 第 ${chapter + 1} 章`} />

      <main className="mx-auto max-w-xl px-6 py-12">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="用时" value={formatTime(summary.elapsedMs)} />
          <Stat label="速度" value={`${summary.wpm} WPM`} />
          <Stat
            label="正确率"
            value={`${Math.round(summary.accuracy * 100)}%`}
          />
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-slate-500">重打单词</h2>
            <span className="text-sm text-slate-400">
              {wrongNames.length} / {summary.total}
            </span>
          </div>
          {wrongNames.length === 0 ? (
            <p className="mt-3 text-emerald-600">全部一次通过 🎉</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {wrongNames.map((n) => (
                <span
                  key={n}
                  className="rounded-md bg-rose-50 px-2 py-1 font-mono text-sm text-rose-600"
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              setChapter(chapter)
              setPage('typing')
            }}
          >
            重练本章
          </Button>
          {hasNext && (
            <Button
              variant="outline"
              onClick={() => {
                setChapter(chapter + 1)
                setPage('typing')
              }}
            >
              下一章 →
            </Button>
          )}
          <Button variant="ghost" onClick={() => setPage('gallery')}>
            返回词库
          </Button>
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}
