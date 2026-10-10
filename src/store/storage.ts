import { STORAGE_PREFIX } from '@/constants'

export const storageKey = (key: string) => `${STORAGE_PREFIX}${key}`

type SyncStorage<T> = {
  getItem: (key: string, initialValue: T) => T
  setItem: (key: string, newValue: T) => void
  removeItem: (key: string) => void
}

function isQuotaExceeded(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

/**
 * jotai atomWithStorage 使用的同步存储适配器。
 * 前缀避免与同域其他应用冲突；所有读写包裹 try/catch，
 * 配额溢出时不抛错、只告警，避免打断打字。
 */
export function createJSONStorage<T>(): SyncStorage<T> {
  return {
    getItem: (key, initialValue) => {
      try {
        const raw = localStorage.getItem(key)
        if (raw === null) return initialValue
        return JSON.parse(raw) as T
      } catch {
        return initialValue
      }
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (e) {
        if (isQuotaExceeded(e)) {
          console.warn('[palabras] 本地存储已满，本次写入被丢弃', e)
        } else {
          console.warn('[palabras] 本地存储写入失败', e)
        }
      }
    },
    removeItem: (key) => {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    },
  }
}
