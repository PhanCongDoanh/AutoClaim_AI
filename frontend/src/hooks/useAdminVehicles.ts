import { adminService } from '@/services/adminService'
import { useListQuery } from './useListQuery'

/** Loads every non-deleted vehicle via `GET /api/admin/vehicles` on mount and on `refetch()`. */
export function useAdminVehicles() {
  const { items, ...rest } = useListQuery(adminService.getVehicles)
  return { vehicles: items, ...rest }
}
