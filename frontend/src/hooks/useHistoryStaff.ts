import { adminService } from '@/services/adminService'
import { useListQuery } from './useListQuery'

/** Everyone who ran a check-out (soft-deleted users and admins included), for the admin staff filter. */
export function useHistoryStaff() {
  return useListQuery(adminService.getHistoryStaff)
}
