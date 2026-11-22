import type { UUID, VehicleStatus } from '@/types'

/** Router `location.state` accepted by the Staff Dashboard. */
export interface DashboardLocationState {
  /** Tab to open (e.g. "Quay lại tab Bảo trì" from the maintenance record). */
  tab?: VehicleStatus
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
  /** After "Đã sửa xong" on the maintenance record (mockup 17): opens "Sẵn sàng" with a toast. */
  maintenanceCompleted?: {
    model: string
    licensePlate: string
    /** `notesSaved` of the complete-maintenance response (false = notes dropped, no booking to store them on). */
    notesSaved: boolean | null
  }
}
