import { AlertCircle, History as HistoryIcon, RotateCw, SearchX } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useHistoryMonths } from '@/hooks/useHistoryMonths'
import { useHistoryStaff } from '@/hooks/useHistoryStaff'
import { useHistorySummary } from '@/hooks/useHistorySummary'
import { useInspectionHistory } from '@/hooks/useInspectionHistory'
import type { AdminInspectionHistoryQuery, InspectionHistorySummaryQuery } from '@/types'
import { AdminFiltersRow, HistoryFiltersBar } from './HistoryFilters'
import { HistoryPagination } from './HistoryPagination'
import { HistorySummaryCards } from './HistorySummaryCards'
import { HistoryTable } from './HistoryTable'
import {
  ALL_MONTHS,
  formatMonth,
  getCurrentMonth,
  HISTORY_PAGE_SIZE,
  parseHistoryFilters,
  toHistorySearchParams,
  type HistoryBasePath,
  type HistoryFilters,
  type HistoryVariant,
} from './historyQuery'

const DESCRIPTIONS: Record<HistoryVariant, string> = {
  staff: 'Các lượt thuê đã trả xe. Bấm “Xem” để xem lại ảnh và kết quả AI.',
  admin: 'Toàn bộ lượt trả xe, kèm số liệu giám sát việc nhân viên loại lỗi AI. Trang chỉ xem.',
}

interface HistoryListPageProps {
  basePath: HistoryBasePath
  /** Admin adds the summary cards, the staff / override filters and the staff column. */
  variant: HistoryVariant
}

/** Mockups S1 / S2 / S2b: returned rentals, filters + page kept in the query string. Shared by staff and admin. */
export function HistoryListPage({ basePath, variant }: HistoryListPageProps) {
  const isAdmin = variant === 'admin'
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseHistoryFilters(searchParams, variant)
  const months = useHistoryMonths()

  // No month in the URL yet: current month if it has returned rentals, otherwise all time.
  const currentMonth = getCurrentMonth()
  const month =
    filters.month ?? (months.isLoading ? null : months.items.includes(currentMonth) ? currentMonth : ALL_MONTHS)
  const monthParam = month === ALL_MONTHS || month === null ? undefined : month
  const search = filters.q.trim() || undefined

  const query: AdminInspectionHistoryQuery | null =
    month === null
      ? null
      : {
          search,
          result: filters.result,
          month: monthParam,
          ...(isAdmin && { staffId: filters.staff ?? undefined, hasOverride: filters.override || undefined }),
          page: filters.page - 1,
          size: HISTORY_PAGE_SIZE,
        }
  const history = useInspectionHistory(query, variant)
  const data = history.data

  const summaryQuery: InspectionHistorySummaryQuery | null =
    isAdmin && month !== null ? { search, month: monthParam, staffId: filters.staff ?? undefined } : null
  const summary = useHistorySummary(summaryQuery)

  function update(changes: Partial<HistoryFilters>) {
    // Any filter change goes back to page 1.
    const next: HistoryFilters = { ...filters, month, page: 1, ...changes }
    setSearchParams(toHistorySearchParams(next), { replace: true })
  }

  const from = data && data.items.length > 0 ? data.page * data.size + 1 : 0
  const to = data ? data.page * data.size + data.items.length : 0
  const monthSuffix = monthParam ? ` trong tháng ${formatMonth(monthParam)}` : ''

  return (
    <section className="space-y-7">
      <PageHeader icon={HistoryIcon} title="Lịch sử kiểm định" description={DESCRIPTIONS[variant]} />

      {isAdmin && (
        <HistorySummaryCards
          summary={summary.data}
          isLoading={summary.isLoading || month === null}
          isFetching={summary.isFetching}
        />
      )}

      <Card className="overflow-hidden">
        <div className="border-b p-4 sm:p-5">
          <HistoryFiltersBar
            search={filters.q}
            onSearchChange={(q) => update({ q })}
            result={filters.result}
            onResultChange={(result) => update({ result })}
            month={month}
            months={months.items}
            onMonthChange={(value) => update({ month: value })}
            extraRow={isAdmin ? <AdminFilters filters={filters} onChange={update} /> : undefined}
          />
        </div>

        {history.isLoading || month === null ? (
          <HistorySkeleton />
        ) : !data ? (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </span>
            <p className="text-sm text-slate-600">{history.error ?? 'Không tải được lịch sử kiểm định.'}</p>
            <Button variant="secondary" size="sm" onClick={history.refetch}>
              <RotateCw />
              Thử lại
            </Button>
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e9f0fd] text-brand-600">
              <SearchX className="h-6 w-6" />
            </span>
            <p className="text-sm text-slate-600">Không có lượt trả xe nào phù hợp.</p>
            {data.totalItems > 0 && (
              <Button variant="secondary" size="sm" onClick={() => update({})}>
                Về trang đầu
              </Button>
            )}
          </div>
        ) : (
          <>
            {history.error && (
              <div className="flex items-center justify-between gap-3 border-b bg-red-50 px-5 py-2.5 text-sm text-red-700">
                <span>{history.error}</span>
                <Button variant="secondary" size="sm" onClick={history.refetch}>
                  <RotateCw />
                  Thử lại
                </Button>
              </div>
            )}
            <HistoryTable
              items={data.items}
              historySearch={location.search}
              isFetching={history.isFetching}
              basePath={basePath}
              variant={variant}
            />
            <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Hiển thị{' '}
                <strong className="text-slate-900">
                  {from}–{to}
                </strong>{' '}
                trên <strong className="text-slate-900">{data.totalItems}</strong> lượt trả xe{monthSuffix}
              </p>
              <HistoryPagination
                page={data.page + 1}
                totalPages={data.totalPages}
                disabled={history.isFetching}
                onPageChange={(page) => update({ page })}
              />
            </div>
          </>
        )}
      </Card>
    </section>
  )
}

interface AdminFiltersProps {
  filters: HistoryFilters
  onChange: (changes: Partial<HistoryFilters>) => void
}

/** Admin filters; the staff list is only fetched on the admin page. */
function AdminFilters({ filters, onChange }: AdminFiltersProps) {
  const staff = useHistoryStaff()
  return (
    <AdminFiltersRow
      staffId={filters.staff}
      staffOptions={staff.items}
      staffLoading={staff.isLoading}
      onStaffChange={(staffId) => onChange({ staff: staffId })}
      overrideOnly={filters.override}
      onOverrideOnlyChange={(override) => onChange({ override })}
    />
  )
}

function HistorySkeleton() {
  return (
    <ul className="divide-y" aria-busy="true" aria-label="Đang tải lịch sử kiểm định">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-5 py-4">
          <div className="h-12 w-[72px] animate-pulse rounded-lg bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/5 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="hidden h-6 w-24 animate-pulse rounded-full bg-slate-100 sm:block" />
        </li>
      ))}
    </ul>
  )
}
