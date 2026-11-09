import { useCallback, useEffect, useState } from 'react'
import { adminService } from '@/services/adminService'
import { getErrorMessage } from '@/services/apiClient'
import type { VehicleResponse } from '@/types'

interface FetchResult {
  vehicles: VehicleResponse[]
  error: string | null
}

interface UseAdminVehiclesResult {
  vehicles: VehicleResponse[]
  /** True only until the first response; refetches keep showing the previous list. */
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/** Loads every non-deleted vehicle via `GET /api/admin/vehicles` on mount and on `refetch()`. */
export function useAdminVehicles(): UseAdminVehiclesResult {
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState<FetchResult | null>(null)

  useEffect(() => {
    let ignore = false
    adminService
      .getVehicles()
      .then((vehicles) => {
        if (!ignore) setResult({ vehicles, error: null })
      })
      .catch((err: unknown) => {
        if (!ignore) setResult((prev) => ({ vehicles: prev?.vehicles ?? [], error: getErrorMessage(err) }))
      })
    return () => {
      ignore = true
    }
  }, [reloadCount])

  const refetch = useCallback(() => setReloadCount((count) => count + 1), [])

  return {
    vehicles: result?.vehicles ?? [],
    isLoading: result === null,
    error: result?.error ?? null,
    refetch,
  }
}
