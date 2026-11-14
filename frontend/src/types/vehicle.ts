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
