import { adminService } from '@/services/adminService'
import type { InspectionHistorySummaryQuery } from '@/types'
import { useParamQuery } from './useParamQuery'

/** Admin summary cards (`GET /admin/inspections/history/summary`); idle while `query` is null. */
export function useHistorySummary(query: InspectionHistorySummaryQuery | null) {
  return useParamQuery(query, adminService.getHistorySummary, { errorTitle: 'Không tải được số liệu tổng hợp' })
}
