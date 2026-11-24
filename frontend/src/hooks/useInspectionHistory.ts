import { adminService } from '@/services/adminService'
import { inspectionService } from '@/services/inspectionService'
import type { AdminInspectionHistoryQuery, InspectionHistoryItem, PageResponse } from '@/types'
import { useParamQuery, type ParamQueryState } from './useParamQuery'

/** Which API serves the history: staff (`/inspections/history`) or admin (`/admin/inspections/history`). */
export type HistoryScope = 'staff' | 'admin'

export type InspectionHistoryState = ParamQueryState<PageResponse<InspectionHistoryItem>>

const LOADERS: Record<HistoryScope, (query: AdminInspectionHistoryQuery) => Promise<PageResponse<InspectionHistoryItem>>> =
  {
    // The staff API has no staff / override filters; the list page never sets them for staff.
    staff: inspectionService.getHistory,
    admin: adminService.getHistory,
  }

/** Loads one page of the inspection history; idle while `query` is null. Errors also raise a toast. */
export function useInspectionHistory(
  query: AdminInspectionHistoryQuery | null,
  scope: HistoryScope = 'staff',
): InspectionHistoryState {
  return useParamQuery(query, LOADERS[scope], { errorTitle: 'Không tải được lịch sử kiểm định' })
}
