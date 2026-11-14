/** UUID serialized by the backend as a string. */
export type UUID = string

/** Java `LocalDateTime` serialized as ISO-8601 without timezone, e.g. `2026-11-05T18:00:00`. */
export type LocalDateTime = string

/** Mirrors `com.autoclaim.api.exception.ErrorResponse`. */
export interface ErrorResponse {
  timestamp: LocalDateTime
  status: number
  error: string
  message: string
  path: string
  fieldErrors?: Record<string, string> | null
  /** Extra data, e.g. `{ sessionId }` on a 409 when the booking already has a check-out session. */
  details?: Record<string, unknown> | null
}

/** Generic `Map<String, Object>` responses (delete / override endpoints). */
export type MessageResponse = Record<string, unknown>
