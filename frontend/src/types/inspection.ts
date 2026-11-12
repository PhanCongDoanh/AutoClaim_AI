import type { LocalDateTime, UUID } from './common'
import type { AngleCode, BookingStatus, SessionType, VehicleStatus } from './enums'
import type { VehicleResponse } from './vehicle'

/** `inspection_sessions.ai_status` of a CHECK_OUT session (a missing value is reported as `FAILED`). */
export type AiStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'

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

/** Mirrors `OverrideDamageRequest`. The reason is required (400 when blank). */
export interface OverrideDamageRequest {
  overrideReason: string
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

/** Mirrors `SessionResultResponseDto`. Self-contained so result screens survive a reload. */
export interface SessionResultResponse {
  sessionId: UUID
  sessionType: SessionType
  /** Null for CHECK_IN sessions. */
  aiStatus: AiStatus | null
  /** Session time (the check-out time for a CHECK_OUT session). */
  createdAt: LocalDateTime
  bookingId: UUID
  bookingStatus: BookingStatus
  expectedReturnAt: LocalDateTime | null
  checkInSessionId: UUID | null
  checkInAt: LocalDateTime | null
  vehicleId: UUID
  /** Vehicle fields only; its rental fields are null. `status` is the vehicle's current status. */
  vehicle: VehicleResponse
  renterName: string | null
  renterPhone: string | null
  staffName: string | null
  /** Sorted ANGLE_1..8 (CCCD_FRONT/BACK first for CHECK_IN); damages sorted by confidence, highest first. */
  images: ImageResult[]
}

/** Mirrors `AiProgressDto` (`GET /api/inspections/{sessionId}/ai-progress`). */
export interface AiProgress {
  sessionId: UUID
  status: AiStatus
  /** 0..100. */
  progress: number
  /** Angle being analysed, e.g. `ANGLE_5`; null when idle or finished. */
  currentAngle: AngleCode | null
  /** Angles already analysed. Empty when `live` is false. */
  completedAngles: AngleCode[]
  totalAngles: number | null
  /** Only set when `status` is `DONE` and `live` is true. */
  newDamages: number | null
  error: string | null
  /** False when the AI service lost the session (restart) or is unreachable: only `status` is reliable. */
  live: boolean
}
