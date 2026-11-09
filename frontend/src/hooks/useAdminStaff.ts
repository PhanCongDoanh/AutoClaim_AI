import { adminService } from '@/services/adminService'
import { useListQuery } from './useListQuery'

/** Loads every non-deleted user via `GET /api/admin/staff` on mount and on `refetch()`. */
export function useAdminStaff() {
  const { items, ...rest } = useListQuery(adminService.getStaff)
  return { staff: items, ...rest }
}
