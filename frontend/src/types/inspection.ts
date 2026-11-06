import type { LocalDateTime, UUID } from './common'
import type { AngleCode, BookingStatus, SessionType, VehicleStatus } from './enums'

/** Mirrors `CheckInRequest` (sent as the `data` part of a multipart request). */
export interface CheckInRequest {
  renterName: string
  renterPhone: string
  vehicleId: UUID
  expectedReturnAt?: LocalDateTime
  handoverNotes?: string
}

/** Mirrors `CheckOutRequest` (sent as the `data` part of a multipart request). */
export interface CheckOutRequest {
  bookingId: UUID
}

/** Mirrors `OverrideDamageRequest`. */
export interface OverrideDamageRequest {
  overrideReason?: string
}

/** Mirrors `InspectionResponseDto`. */
export interface InspectionResponse {
  sessionId: UUID
  bookingId: UUID
  vehicleId: UUID
  sessionType: SessionType
  bookingStatus: BookingStatus
  vehicleStatus: VehicleStatus
  imageCount: number
  createdAt: LocalDateTime
  message: string
}

/** Mirrors `DamageDto`. `boundingBox` is a raw JSON string from the AI module. */
export interface Damage {
  detectionId: UUID
  damageType: string
  partName: string | null
  confidenceScore: number
  boundingBox: string
  isOverridden: boolean
  overrideReason: string | null
}

/** Mirrors `ImageResultDto`. `checkIn*` fields pair a check-out image with its check-in counterpart. */
export interface ImageResult {
  imageId: UUID
  imageUrl: string
  checkInImageId: UUID | null
  checkInImageUrl: string | null
  angleCode: AngleCode
  damages: Damage[]
}

/** Mirrors `SessionResultResponseDto`. */
export interface SessionResultResponse {
  sessionId: UUID
  sessionType: SessionType
  vehicleId: UUID
  images: ImageResult[]
}
