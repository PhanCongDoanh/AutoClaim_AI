import { AxiosError } from 'axios'
import type { ErrorResponse } from '../types'

export { axiosInstance as apiClient } from '@/utils/axiosInstance'

/** Extracts a user-facing message from an Axios error carrying the backend `ErrorResponse`. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as Partial<ErrorResponse> | undefined
    return data?.message ?? error.message
  }
  return error instanceof Error ? error.message : 'Unexpected error'
}

/** Per-field messages from a Bean Validation 400 (`ErrorResponse.fieldErrors`), keyed by DTO field. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof AxiosError)) return {}
  const data = error.response?.data as Partial<ErrorResponse> | undefined
  return data?.fieldErrors ?? {}
}

/** True for a 409 Conflict (e.g. the booking was completed in another tab). */
export function isConflictError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 409
}

/**
 * `details.sessionId` of a 409 Conflict — sent by `POST /inspections/check-out` when the booking
 * already has a check-out session. Null for any other error.
 */
export function getConflictSessionId(error: unknown): string | null {
  if (!(error instanceof AxiosError) || error.response?.status !== 409) return null
  const data = error.response.data as Partial<ErrorResponse> | undefined
  const sessionId = data?.details?.sessionId
  return typeof sessionId === 'string' ? sessionId : null
}

/**
 * Builds multipart bodies for Spring `@RequestPart("data")` DTOs: the DTO must be a JSON blob,
 * otherwise Spring rejects it with 415 Unsupported Media Type.
 */
export function buildInspectionFormData(data: object, images: File[]): FormData {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  images.forEach((image) => formData.append('images', image))
  return formData
}
