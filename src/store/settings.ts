import { atomWithStorage } from 'jotai/utils'

import { DEFAULT_SETTINGS } from '@/constants'
import type { Settings } from '@/types'

import { createJSONStorage, storageKey } from './storage'

export const settingsAtom = atomWithStorage<Settings>(
  storageKey('settings'),
  { ...DEFAULT_SETTINGS },
  createJSONStorage<Settings>(),
)
