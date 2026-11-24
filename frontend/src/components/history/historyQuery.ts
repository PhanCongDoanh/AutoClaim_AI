import type { HistoryResultFilter } from '@/types'

/** "All time" value of the month filter (in the URL and the select). */
export const ALL_MONTHS = 'all'

export const HISTORY_PAGE_SIZE = 10

const RESULT_VALUES: readonly HistoryResultFilter[] = ['ALL', 'DAMAGED', 'CLEAN']
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

/** History filters as stored in the query string (`?q=&result=&month=&page=`); `page` is 1-based here. */
export interface HistoryFilters {
  q: string
  result: HistoryResultFilter
  /** `YYYY-MM`, `all`, or null when not chosen yet (→ current month if it has data, else all). */
  month: string | null
  page: number
}

export function parseHistoryFilters(params: URLSearchParams): HistoryFilters {
  const result = params.get('result') as HistoryResultFilter | null
  const month = params.get('month')
  const page = Number(params.get('page'))
  return {
    q: params.get('q') ?? '',
    result: result && RESULT_VALUES.includes(result) ? result : 'ALL',
    month: month === ALL_MONTHS || (month && MONTH_PATTERN.test(month)) ? month : null,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  }
}

/** Query string for the filters; defaults are left out to keep URLs short. */
export function toHistorySearchParams(filters: HistoryFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q.trim()) params.set('q', filters.q.trim())
  if (filters.result !== 'ALL') params.set('result', filters.result)
  if (filters.month) params.set('month', filters.month)
  if (filters.page > 1) params.set('page', String(filters.page))
  return params
}

/** `YYYY-MM` of today (local time). */
export function getCurrentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** "2026-11" → "11/2026". */
export function formatMonth(month: string): string {
  const [year, mm] = month.split('-')
  return `${mm}/${year}`
}

/** Router state passed to the detail page so "Quay lại" restores the filters. */
export interface HistoryDetailLocationState {
  /** `location.search` of the list (e.g. `?result=DAMAGED&page=2`). */
  historySearch: string
}
