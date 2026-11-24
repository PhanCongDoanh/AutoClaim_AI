import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/services/apiClient'

interface FetchResult<T> {
  requestKey: string
  data: T | null
  error: string | null
}

export interface ParamQueryState<T> {
  /** Latest response; the previous one stays visible while the next one loads. */
  data: T | null
  /** True until the first response (show a skeleton). */
  isLoading: boolean
  /** True while any request is in flight (dim the content). */
  isFetching: boolean
  error: string | null
  refetch: () => void
}

interface ParamQueryOptions {
  /** Toast title on error; the toast id is derived from it so repeated errors don't stack. */
  errorTitle: string
}

/**
 * Runs `load(params)` whenever `params` change (compared by JSON) or on `refetch()`; idle while `params` is null.
 * `load` must be stable (e.g. a service method). Errors raise a toast and keep the previous data.
 */
export function useParamQuery<P, T>(
  params: P | null,
  load: (params: P) => Promise<T>,
  { errorTitle }: ParamQueryOptions,
): ParamQueryState<T> {
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState<FetchResult<T> | null>(null)
  const paramsKey = params === null ? null : JSON.stringify(params)
  const requestKey = `${paramsKey ?? ''}|${reloadCount}`

  useEffect(() => {
    if (paramsKey === null) return
    let ignore = false
    load(JSON.parse(paramsKey) as P)
      .then((data) => {
        if (!ignore) setResult({ requestKey, data, error: null })
      })
      .catch((err: unknown) => {
        if (ignore) return
        const message = getErrorMessage(err)
        toast.error(errorTitle, { id: errorTitle, description: message })
        setResult((prev) => ({ requestKey, data: prev?.data ?? null, error: message }))
      })
    return () => {
      ignore = true
    }
  }, [paramsKey, requestKey, load, errorTitle])

  const refetch = useCallback(() => setReloadCount((count) => count + 1), [])
  const isFetching = paramsKey !== null && result?.requestKey !== requestKey
  return {
    data: result?.data ?? null,
    isLoading: paramsKey !== null && result === null,
    isFetching,
    error: isFetching ? null : (result?.error ?? null),
    refetch,
  }
}
