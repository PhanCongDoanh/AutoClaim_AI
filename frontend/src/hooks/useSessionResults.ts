import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '@/services/apiClient'
import { inspectionService } from '@/services/inspectionService'
import type { SessionResultResponse, UUID } from '@/types'

interface FetchResult {
  requestKey: string
  sessionId: UUID
  data: SessionResultResponse | null
  error: string | null
}

export interface SessionResultsState {
  /** Latest results of this session; kept while a refetch is in flight. */
  data: SessionResultResponse | null
  /** True until the first response for the current session. */
  isLoading: boolean
  /** True while any request (first load or refetch) is in flight. */
  isFetching: boolean
  error: string | null
  refetch: () => void
  /** Updates the loaded results in place (e.g. after an override) without reloading. */
  mutate: (updater: (data: SessionResultResponse) => SessionResultResponse) => void
}

/** Loads `GET /api/inspections/{sessionId}/results`; idle when `sessionId` is null. */
export function useSessionResults(sessionId: UUID | null): SessionResultsState {
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState<FetchResult | null>(null)
  const requestKey = `${sessionId ?? ''}|${reloadCount}`

  useEffect(() => {
    if (!sessionId) return
    let ignore = false
    inspectionService
      .getSessionResults(sessionId)
      .then((data) => {
        if (!ignore) setResult({ requestKey, sessionId, data, error: null })
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setResult((prev) => ({
            requestKey,
            sessionId,
            data: prev?.sessionId === sessionId ? prev.data : null,
            error: getErrorMessage(err),
          }))
        }
      })
    return () => {
      ignore = true
    }
  }, [sessionId, requestKey])

  const refetch = useCallback(() => setReloadCount((count) => count + 1), [])
  const mutate = useCallback((updater: (data: SessionResultResponse) => SessionResultResponse) => {
    setResult((prev) => (prev?.data ? { ...prev, data: updater(prev.data) } : prev))
  }, [])

  const sameSession = Boolean(sessionId) && result?.sessionId === sessionId
  const isFetching = Boolean(sessionId) && result?.requestKey !== requestKey
  return {
    data: sameSession ? (result?.data ?? null) : null,
    isLoading: Boolean(sessionId) && !sameSession,
    isFetching,
    error: sameSession && !isFetching ? (result?.error ?? null) : null,
    refetch,
    mutate,
  }
}
