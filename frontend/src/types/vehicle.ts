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

export interface VehicleQuery {
  status: VehicleStatus
  search?: string
}
