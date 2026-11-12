import { useCallback, useEffect, useState } from 'react'
import { vehicleService } from '@/services/vehicleService'
import type { VehicleCounts } from '@/types'

/**
 * Loads `GET /api/vehicles/counts` for the dashboard tab badges. Errors are ignored (badges are
 * simply hidden), and the previous counts stay visible while refetching.
 */
export function useVehicleCounts(): { counts: VehicleCounts | undefined; refetch: () => void } {
  const [reloadCount, setReloadCount] = useState(0)
  const [counts, setCounts] = useState<VehicleCounts>()

  useEffect(() => {
    let ignore = false
    vehicleService
      .getCounts()
      .then((data) => {
        if (!ignore) setCounts(data)
      })
      .catch(() => {
        // Badges are optional; the vehicle lists show their own errors.
      })
    return () => {
      ignore = true
    }
  }, [reloadCount])

  const refetch = useCallback(() => setReloadCount((count) => count + 1), [])
  return { counts, refetch }
}
