import { atomWithStorage } from 'jotai/utils'

import type { ChapterProgress, CustomDictMap, ProgressMap } from '@/types'

import { createJSONStorage, storageKey } from './storage'

export const progressAtom = atomWithStorage<ProgressMap>(
  storageKey('progress'),
  {},
  createJSONStorage<ProgressMap>(),
)

export const customDictsAtom = atomWithStorage<CustomDictMap>(
  storageKey('customDicts'),
  {},
  createJSONStorage<CustomDictMap>(),
)

/** 标记某词库的某章节已完成，返回新的 progress map */
export function markChapterDone(
  map: ProgressMap,
  dictId: string,
  chapter: number,
): ProgressMap {
  const prev: ChapterProgress = map[dictId] ?? {
    done: [],
    lastChapter: 0,
    updatedAt: 0,
  }
  const done = prev.done.includes(chapter)
    ? prev.done
    : [...prev.done, chapter].sort((a, b) => a - b)
  return {
    ...map,
    [dictId]: { done, lastChapter: chapter, updatedAt: Date.now() },
  }
}
