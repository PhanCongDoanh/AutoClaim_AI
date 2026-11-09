import axios, { AxiosError } from 'axios'
import type { ErrorResponse } from '../types'

export const TOKEN_STORAGE_KEY = 'autoclaim.token'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 60_000,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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
