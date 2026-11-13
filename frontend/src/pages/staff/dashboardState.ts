import type { UUID, VehicleStatus } from '@/types'

/** Router `location.state` accepted by the Staff Dashboard. */
export interface DashboardLocationState {
  /** After a check-in: opens the "Đang thuê" tab with an inline notice. */
  checkedIn?: {
    model: string
    licensePlate: string
  }
  /** After completing a check-out: opens the vehicle's new tab and shows a toast (mockups 10 / 14). */
  checkedOut?: {
    model: string
    licensePlate: string
    /** AVAILABLE (no damage) or MAINTENANCE (damage found). */
    vehicleStatus: VehicleStatus
    sessionId: UUID
    /** Set when leaving the report screen (mockup 13): toast "Đã xuất biên bản PDF" with "Tải lại PDF" (mockup 14). */
    reportFileName?: string
  }
}
