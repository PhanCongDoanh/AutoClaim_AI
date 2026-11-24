import type { HistoryResultFilter, UUID } from '@/types'

/** Staff page or admin page (admin adds the summary cards, the staff / override filters and the staff column). */
export type HistoryVariant = 'staff' | 'admin'

/** Base path of the list; the detail page is `${basePath}/:checkOutSessionId`. */
export type HistoryBasePath = '/staff/history' | '/admin/history'

/** "All time" value of the month filter (in the URL and the select). */
export const ALL_MONTHS = 'all'

export const HISTORY_PAGE_SIZE = 10

const RESULT_VALUES: readonly HistoryResultFilter[] = ['ALL', 'DAMAGED', 'CLEAN']
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * History filters as stored in the query string (`?q=&result=&month=&page=`, admin also `&staff=&override=1`);
 * `page` is 1-based here.
 */
export interface HistoryFilters {
  q: string
  result: HistoryResultFilter
  /** `YYYY-MM`, `all`, or null when not chosen yet (→ current month if it has data, else all). */
  month: string | null
  page: number
  /** Admin only: staff of the check-out session, null = everyone. */
  staff: UUID | null
  /** Admin only: only returns with at least one AI detection rejected by staff. */
  override: boolean
}

export function parseHistoryFilters(params: URLSearchParams, variant: HistoryVariant): HistoryFilters {
  const result = params.get('result') as HistoryResultFilter | null
  const month = params.get('month')
  const page = Number(params.get('page'))
  const staff = params.get('staff')
  const isAdmin = variant === 'admin'
  return {
    q: params.get('q') ?? '',
    result: result && RESULT_VALUES.includes(result) ? result : 'ALL',
    month: month === ALL_MONTHS || (month && MONTH_PATTERN.test(month)) ? month : null,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    staff: isAdmin && staff && UUID_PATTERN.test(staff) ? staff : null,
    override: isAdmin && params.get('override') === '1',
  }
}

/** Query string for the filters; defaults are left out to keep URLs short. */
export function toHistorySearchParams(filters: HistoryFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q.trim()) params.set('q', filters.q.trim())
  if (filters.result !== 'ALL') params.set('result', filters.result)
  if (filters.month) params.set('month', filters.month)
  if (filters.staff) params.set('staff', filters.staff)
  if (filters.override) params.set('override', '1')
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
