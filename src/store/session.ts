import { atomWithStorage } from 'jotai/utils'

import type { PageName, ResumeMap } from '@/types'

import { createJSONStorage, storageKey } from './storage'

export const pageAtom = atomWithStorage<PageName>(
  storageKey('page'),
  'gallery',
  createJSONStorage<PageName>(),
)

export const currentDictIdAtom = atomWithStorage<string>(
  storageKey('currentDictId'),
  'es-core',
  createJSONStorage<string>(),
)

export const currentChapterAtom = atomWithStorage<number>(
  storageKey('currentChapter'),
  0,
  createJSONStorage<number>(),
)

/**
 * 各章节「打到第几个词」的续打位置，刷新后据此回到原处。
 * 必须 getOnInit：否则首帧读到空对象，续打会在打字机初始化前被当成「无记录」而丢失。
 */
export const typingResumeAtom = atomWithStorage<ResumeMap>(
  storageKey('typingResume'),
  {},
  createJSONStorage<ResumeMap>(),
  { getOnInit: true },
)

export const resumeKey = (dictId: string, chapter: number): string =>
  `${dictId}#${chapter}`
