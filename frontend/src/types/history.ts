import type { LocalDateTime, UUID } from './common'

/** `result` filter of `GET /api/inspections/history` (by damages not rejected by staff). */
export type HistoryResultFilter = 'ALL' | 'DAMAGED' | 'CLEAN'

/** Mirrors `InspectionHistoryItemDto`: one returned rental. */
export interface InspectionHistoryItem {
  checkOutSessionId: UUID
  bookingId: UUID
  model: string
  licensePlate: string
  avatarUrl: string | null
  renterName: string | null
  renterPhone: string | null
  /** Null if the booking has no check-in session. */
  checkInAt: LocalDateTime | null
  checkOutAt: LocalDateTime
  /** Damages not rejected by staff. */
  damageCount: number
  /** Detections rejected by staff as AI mistakes. */
  overriddenCount: number
  result: Exclude<HistoryResultFilter, 'ALL'>
}

/** Mirrors `PageResponseDto` (`page` is 0-based). */
export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

/** Query params of `GET /api/inspections/history`. */
export interface InspectionHistoryQuery {
  search?: string
  result?: HistoryResultFilter
  /** `YYYY-MM`; omitted = all time. */
  month?: string
  page?: number
  size?: number
}
