import { AlertCircle, History as HistoryIcon, RotateCw, SearchX } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useHistoryMonths } from '@/hooks/useHistoryMonths'
import { useInspectionHistory } from '@/hooks/useInspectionHistory'
import type { InspectionHistoryQuery } from '@/types'
import { HistoryFiltersBar } from './history/HistoryFilters'
import { HistoryPagination } from './history/HistoryPagination'
import { HistoryTable } from './history/HistoryTable'
import {
  ALL_MONTHS,
  formatMonth,
  getCurrentMonth,
  HISTORY_PAGE_SIZE,
  parseHistoryFilters,
  toHistorySearchParams,
  type HistoryFilters,
} from './history/historyQuery'

/** Mockups S1 / S2 / S2b: returned rentals, filters + page kept in the query string. */
export default function History() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseHistoryFilters(searchParams)
  const months = useHistoryMonths()

  // No month in the URL yet: current month if it has returned rentals, otherwise all time.
  const currentMonth = getCurrentMonth()
  const month =
    filters.month ?? (months.isLoading ? null : months.items.includes(currentMonth) ? currentMonth : ALL_MONTHS)

  const query: InspectionHistoryQuery | null =
    month === null
      ? null
      : {
          search: filters.q.trim() || undefined,
          result: filters.result,
          month: month === ALL_MONTHS ? undefined : month,
          page: filters.page - 1,
          size: HISTORY_PAGE_SIZE,
        }
  const history = useInspectionHistory(query)
  const data = history.data

  function update(changes: Partial<HistoryFilters>) {
    // Any filter change goes back to page 1.
    const next: HistoryFilters = { ...filters, month, page: 1, ...changes }
    setSearchParams(toHistorySearchParams(next), { replace: true })
  }

  const from = data && data.items.length > 0 ? data.page * data.size + 1 : 0
  const to = data ? data.page * data.size + data.items.length : 0
  const monthSuffix = month && month !== ALL_MONTHS ? ` trong tháng ${formatMonth(month)}` : ''

  return (
    <section className="space-y-7">
      <PageHeader
        icon={HistoryIcon}
        title="Lịch sử kiểm định"
        description="Các lượt thuê đã trả xe. Bấm “Xem” để xem lại ảnh và kết quả AI."
      />

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
            <HistoryTable items={data.items} historySearch={location.search} isFetching={history.isFetching} />
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
