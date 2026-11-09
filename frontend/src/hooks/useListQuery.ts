import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '@/services/apiClient'

interface FetchResult<T> {
  items: T[]
  error: string | null
}

export interface ListQueryResult<T> {
  items: T[]
  /** True only until the first response; refetches keep showing the previous list. */
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/** Runs `load` on mount and on every `refetch()`. `load` must be stable (e.g. a service method). */
export function useListQuery<T>(load: () => Promise<T[]>): ListQueryResult<T> {
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState<FetchResult<T> | null>(null)

  useEffect(() => {
    let ignore = false
    load()
      .then((items) => {
        if (!ignore) setResult({ items, error: null })
      })
      .catch((err: unknown) => {
        if (!ignore) setResult((prev) => ({ items: prev?.items ?? [], error: getErrorMessage(err) }))
      })
    return () => {
      ignore = true
    }
  }, [load, reloadCount])

  const refetch = useCallback(() => setReloadCount((count) => count + 1), [])

  return {
    items: result?.items ?? [],
    isLoading: result === null,
    error: result?.error ?? null,
    refetch,
  }
}
