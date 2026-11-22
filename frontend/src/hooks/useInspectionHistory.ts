import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/services/apiClient'
import { inspectionService } from '@/services/inspectionService'
import type { InspectionHistoryItem, InspectionHistoryQuery, PageResponse } from '@/types'

interface FetchResult {
  requestKey: string
  data: PageResponse<InspectionHistoryItem> | null
  error: string | null
}

export interface InspectionHistoryState {
  /** Latest page; the previous page stays visible while the next one loads. */
  data: PageResponse<InspectionHistoryItem> | null
  /** True until the first response (show a skeleton). */
  isLoading: boolean
  /** True while any request is in flight (dim the table). */
  isFetching: boolean
  error: string | null
  refetch: () => void
}

/** Loads one page of `GET /inspections/history`; idle while `query` is null. Errors also raise a toast. */
export function useInspectionHistory(query: InspectionHistoryQuery | null): InspectionHistoryState {
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState<FetchResult | null>(null)
  const queryKey = query ? JSON.stringify(query) : null
  const requestKey = `${queryKey ?? ''}|${reloadCount}`

  useEffect(() => {
    if (!queryKey) return
    let ignore = false
    inspectionService
      .getHistory(JSON.parse(queryKey) as InspectionHistoryQuery)
      .then((data) => {
        if (!ignore) setResult({ requestKey, data, error: null })
      })
      .catch((err: unknown) => {
        if (ignore) return
        const message = getErrorMessage(err)
        toast.error('Không tải được lịch sử kiểm định', { id: 'history-error', description: message })
        setResult((prev) => ({ requestKey, data: prev?.data ?? null, error: message }))
      })
    return () => {
      ignore = true
    }
  }, [queryKey, requestKey])

  const refetch = useCallback(() => setReloadCount((count) => count + 1), [])
  const isFetching = Boolean(queryKey) && result?.requestKey !== requestKey
  return {
    data: result?.data ?? null,
    isLoading: Boolean(queryKey) && result === null,
    isFetching,
    error: isFetching ? null : (result?.error ?? null),
    refetch,
  }
}
