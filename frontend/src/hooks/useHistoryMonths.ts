import { inspectionService } from '@/services/inspectionService'
import { useListQuery } from './useListQuery'

/** `YYYY-MM` months with returned rentals (`GET /inspections/history/months`), newest first. */
export function useHistoryMonths() {
  return useListQuery(inspectionService.getHistoryMonths)
}
