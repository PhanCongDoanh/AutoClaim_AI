import type { LocalDateTime } from '@/types'

/**
 * Parses a backend `LocalDateTime` (ISO without timezone, e.g. `2026-11-05T18:00:00`) as local time.
 * Returns null for missing or unparsable values.
 */
export function parseLocalDateTime(value: LocalDateTime | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const pad = (n: number) => String(n).padStart(2, '0')

/** `28/10/2026 · 09:05`, or `—` when missing. */
export function formatDateTime(value: LocalDateTime | null | undefined): string {
  const date = parseLocalDateTime(value)
  if (!date) return '—'
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `30/10 · 17:00`, or `—` when missing. */
export function formatShortDateTime(value: LocalDateTime | null | undefined): string {
  const date = parseLocalDateTime(value)
  if (!date) return '—'
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} · ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `28/10 09:05` (photo labels "CHECK-IN · 28/10 09:05"), or `—` when missing. */
export function formatDayMonthTime(value: LocalDateTime | null | undefined): string {
  const date = parseLocalDateTime(value)
  if (!date) return '—'
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `30-10-2026` (safe for file names), or today's date when missing. */
export function formatFileDate(value: LocalDateTime | null | undefined): string {
  const date = parseLocalDateTime(value) ?? new Date()
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`
}

export type DueState = 'overdue' | 'soon' | 'normal' | 'unknown'

const DUE_SOON_MS = 24 * 60 * 60 * 1000

/** Return-deadline urgency: past due, due within 24 hours, or later. */
export function getDueState(expectedReturnAt: LocalDateTime | null | undefined, now = new Date()): DueState {
  const due = parseLocalDateTime(expectedReturnAt)
  if (!due) return 'unknown'
  const remaining = due.getTime() - now.getTime()
  if (remaining < 0) return 'overdue'
  return remaining <= DUE_SOON_MS ? 'soon' : 'normal'
}
