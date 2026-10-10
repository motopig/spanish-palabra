import { useAtomValue } from 'jotai'
import { useEffect, useMemo, useState } from 'react'

import {
  findMeta,
  loadDictIndex,
  loadDictionary,
  mergeDictList,
} from '@/data/dictionaryRegistry'
import { customDictsAtom } from '@/store/progress'
import type { Dictionary, DictionaryMeta } from '@/types'

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function useDictList() {
  const custom = useAtomValue(customDictsAtom)
  const [index, setIndex] = useState<DictionaryMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadDictIndex()
      .then((list) => alive && setIndex(list))
      .catch((e) => alive && setError(errMessage(e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const list = useMemo(() => mergeDictList(index, custom), [index, custom])
  return { list, loading, error }
}

export function useDictionary(dictId: string) {
  const custom = useAtomValue(customDictsAtom)
  const { list, loading: listLoading, error: listError } = useDictList()
  const [dict, setDict] = useState<Dictionary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (listLoading) return
    const meta = findMeta(list, dictId)
    if (!meta) {
      setError(`词库不存在：${dictId}`)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    loadDictionary(meta, custom)
      .then((d) => {
        if (!alive) return
        setDict(d)
        setError(null)
      })
      .catch((e) => alive && setError(errMessage(e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [dictId, list, listLoading, custom])

  return { dict, loading: loading || listLoading, error: error ?? listError }
}
