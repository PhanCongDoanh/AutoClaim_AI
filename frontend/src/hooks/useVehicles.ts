import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '@/services/apiClient'
import { vehicleService } from '@/services/vehicleService'
import type { VehicleResponse, VehicleStatus } from '@/types'

const SEARCH_DEBOUNCE_MS = 300

interface UseVehiclesResult {
  vehicles: VehicleResponse[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

interface FetchResult {
  requestKey: string
  vehicles: VehicleResponse[]
  error: string | null
}

/** Loads vehicles for a status via `GET /api/vehicles`, debouncing the free-text search. */
export function useVehicles(status: VehicleStatus, search = ''): UseVehiclesResult {
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState<FetchResult | null>(null)

  const trimmedSearch = search.trim()
  const requestKey = `${status}|${trimmedSearch}|${reloadCount}`

  useEffect(() => {
    let ignore = false
    const timer = setTimeout(
      () => {
        vehicleService
          .getVehicles({ status, search: trimmedSearch || undefined })
          .then((vehicles) => {
            if (!ignore) setResult({ requestKey, vehicles, error: null })
          })
          .catch((err: unknown) => {
            if (!ignore) setResult({ requestKey, vehicles: [], error: getErrorMessage(err) })
          })
      },
      trimmedSearch ? SEARCH_DEBOUNCE_MS : 0,
    )

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [status, trimmedSearch, requestKey])

  const refetch = useCallback(() => setReloadCount((count) => count + 1), [])

  const isLoading = result?.requestKey !== requestKey
  return {
    vehicles: isLoading ? [] : result.vehicles,
    isLoading,
    error: isLoading ? null : result.error,
    refetch,
  }
}
