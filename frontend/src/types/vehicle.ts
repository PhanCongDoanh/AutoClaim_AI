import type { LocalDateTime, UUID } from './common'
import type { VehicleStatus } from './enums'

/** Mirrors `VehicleResponseDto`. Booking/renter fields are only set for rented vehicles. */
export interface VehicleResponse {
  vehicleId: UUID
  licensePlate: string
  model: string
  seats: number
  status: VehicleStatus
  avatarUrl: string | null
  activeBookingId: UUID | null
  renterName: string | null
  renterPhone: string | null
  checkInSessionId: UUID | null
  /** When the vehicle was handed over (CHECK_IN session time); rented vehicles only. */
  checkInAt: LocalDateTime | null
  /** Agreed return time; rented vehicles only, may be null for old bookings. */
  expectedReturnAt: LocalDateTime | null
  // Maintenance fields: only set for MAINTENANCE vehicles in `GET /vehicles?status=MAINTENANCE`, from the latest
  // COMPLETED booking (the rental that sent the vehicle to maintenance). All null when there is none.
  /** CHECK_OUT session of that booking (damages + PDF report); null if it has none. */
  lastCheckOutSessionId: UUID | null
  /** When the vehicle entered maintenance. Non-null exactly when notes can be saved on a booking. */
  maintenanceSince: LocalDateTime | null
  lastRenterName: string | null
  /** Damages of that check-out not rejected by staff; null without a check-out session. */
  damageCount: number | null
  /** Highest-confidence damage, e.g. "Trầy xước · Cản trước". */
  damageSummary: string | null
  maintenanceNotes: string | null
  /**
   * Only in the `complete-maintenance` response: true = notes saved, false = notes sent but there was no
   * booking to store them on, null = no notes sent.
   */
  notesSaved?: boolean | null
  createdAt: LocalDateTime
  updatedAt: LocalDateTime
}

/** Form fields for `POST/PUT /api/admin/vehicles` (sent as multipart, not JSON). */
export interface VehicleFormData {
  model: string
  licensePlate: string
  /** Defaults to 5 on the backend. */
  seats?: number
  avatar?: File | null
}

/** Max length of `maintenanceNotes` (backend rejects longer notes with 400). */
export const MAINTENANCE_NOTES_MAX_LENGTH = 1000

/** Mirrors `CompleteMaintenanceRequest`. */
export interface CompleteMaintenanceRequest {
  maintenanceNotes?: string
}

/** Mirrors `GET /api/vehicles/counts`: non-deleted vehicles per status (0 when none). */
export type VehicleCounts = Record<VehicleStatus, number>

export interface VehicleQuery {
  status: VehicleStatus
  search?: string
}
