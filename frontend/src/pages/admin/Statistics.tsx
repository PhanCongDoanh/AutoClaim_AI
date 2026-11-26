import {
  AlertCircle,
  BarChart3,
  Calendar,
  Car,
  Download,
  RotateCw,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ALL_MONTHS, formatMonth, getCurrentMonth } from '@/components/history/historyQuery'
import { PageHeader } from '@/components/layout/PageHeader'
import { DamageBreakdownChart } from '@/components/statistics/DamageBreakdownChart'
import { KpiCards } from '@/components/statistics/KpiCards'
import { ReturnTrendChart } from '@/components/statistics/ReturnTrendChart'
import { exportStatisticsCsv } from '@/components/statistics/statisticsCsv'
import { StatisticsSkeleton } from '@/components/statistics/StatisticsSkeleton'
import { StatisticsTables } from '@/components/statistics/StatisticsTables'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useHistoryMonths } from '@/hooks/useHistoryMonths'
import { useListQuery } from '@/hooks/useListQuery'
import { adminService } from '@/services/adminService'
import { getErrorMessage } from '@/services/apiClient'
import { statisticsService } from '@/services/statisticsService'
import type { StatisticsResponse, UUID } from '@/types'

const ALL_VEHICLES = 'all'
const LAST_3_MONTHS = 'last_3_months'
const LAST_6_MONTHS = 'last_6_months'

function getPeriodLabel(month: string): string {
  if (month === ALL_MONTHS) return 'Tất cả thời gian'
  if (month === LAST_3_MONTHS) return '3 tháng gần nhất'
  if (month === LAST_6_MONTHS) return '6 tháng gần nhất'
  return `Tháng ${formatMonth(month)}`
}

export default function Statistics() {
  const months = useHistoryMonths()
  const vehiclesQuery = useListQuery(adminService.getVehicles)

  // Match the exact default-month logic of HistoryListPage: current month if it has data, else "all".
  const currentMonth = getCurrentMonth()
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [vehicleId, setVehicleId] = useState<UUID | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  const activeMonth =
    selectedMonth ??
    (months.isLoading ? null : months.items.includes(currentMonth) ? currentMonth : ALL_MONTHS)

  const [state, setState] = useState<{
    data: StatisticsResponse | null
    error: string | null
    completedKey: string | null
  }>({
    data: null,
    error: null,
    completedKey: null,
  })

  const requestKey =
    activeMonth !== null ? `${activeMonth}:${vehicleId ?? ALL_VEHICLES}:${reloadTick}` : null
  const isFetching = requestKey === null || state.completedKey !== requestKey
  const isLoading = state.completedKey === null
  const { data, error } = state

  const refetch = useCallback(() => {
    setReloadTick((tick) => tick + 1)
  }, [])

  useEffect(() => {
    if (activeMonth === null || requestKey === null) return
    const controller = new AbortController()

    statisticsService
      .getStatistics({ month: activeMonth, vehicleId }, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return
        setState({ data: response, error: null, completedKey: requestKey })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setState((prev) => ({
          data: prev.data,
          error: getErrorMessage(err),
          completedKey: requestKey,
        }))
      })

    return () => controller.abort()
  }, [activeMonth, vehicleId, requestKey])

  const vehicles = vehiclesQuery.items
  const selectedVehicle = vehicleId
    ? (vehicles.find((vehicle) => vehicle.vehicleId === vehicleId) ?? null)
    : null

  // Include currentMonth in the dropdown even if it has no returns yet, alongside real DB months.
  const monthOptions = months.items.includes(currentMonth)
    ? months.items
    : [currentMonth, ...months.items]

  function handleExportCsv() {
    if (!data || !activeMonth) return
    exportStatisticsCsv({
      data,
      periodKey: activeMonth,
      periodLabel: getPeriodLabel(activeMonth),
      selectedVehicle,
    })
    toast.success('Đã xuất báo cáo thống kê định dạng CSV (UTF-8).')
  }

  return (
    <section className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Thống kê"
        description="Tổng hợp xu hướng kiểm định, phân bổ hư hại ngoại thất và độ chính xác AI. Các lỗi đã đánh dấu 'AI nhầm' không được tính vào hư hại mới."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month / Period Filter */}
            <Select
              value={activeMonth ?? undefined}
              onValueChange={setSelectedMonth}
              disabled={activeMonth === null}
            >
              <SelectTrigger
                className="h-10 w-full min-w-[184px] rounded-xl border-slate-200 bg-white font-medium text-slate-800 shadow-sm sm:w-auto"
                aria-label="Chọn khoảng thời gian"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
                  <SelectValue placeholder="Đang tải…" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_MONTHS}>Tất cả thời gian</SelectItem>
                <SelectItem value={LAST_3_MONTHS}>3 tháng gần nhất</SelectItem>
                <SelectItem value={LAST_6_MONTHS}>6 tháng gần nhất</SelectItem>
                {monthOptions.map((monthValue) => (
                  <SelectItem key={monthValue} value={monthValue}>
                    Tháng {formatMonth(monthValue)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Vehicle Filter (live from GET /api/admin/vehicles) */}
            <Select
              value={vehicleId ?? ALL_VEHICLES}
              onValueChange={(value) => setVehicleId(value === ALL_VEHICLES ? null : value)}
              disabled={vehiclesQuery.isLoading && vehicles.length === 0}
            >
              <SelectTrigger
                className="h-10 w-full min-w-[215px] max-w-[260px] rounded-xl border-slate-200 bg-white font-medium text-slate-800 shadow-sm sm:w-auto"
                aria-label="Lọc theo xe"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Car className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="truncate">
                    <SelectValue placeholder="Tất cả xe" />
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VEHICLES}>Tất cả xe</SelectItem>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.vehicleId} value={vehicle.vehicleId}>
                    {vehicle.model} · {vehicle.licensePlate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export CSV Outline Button */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleExportCsv}
              disabled={!data || isFetching}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-700"
            >
              <Download className="h-4 w-4" />
              Xuất CSV
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <StatisticsSkeleton />
      ) : error && !data ? (
        <Card className="flex flex-col items-center gap-3 rounded-2xl border-slate-200/80 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </span>
          <p className="text-base font-semibold text-slate-900">Không tải được dữ liệu thống kê</p>
          <p className="max-w-md text-sm text-slate-500">{error}</p>
          <Button variant="secondary" size="sm" onClick={refetch} className="mt-1">
            <RotateCw className="h-4 w-4" />
            Thử lại
          </Button>
        </Card>
      ) : data ? (
        <>
          {error && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </span>
              <Button variant="secondary" size="sm" onClick={refetch}>
                <RotateCw className="h-3.5 w-3.5" />
                Thử lại
              </Button>
            </div>
          )}

          {/* Row 1: 4 KPI Cards */}
          <KpiCards summary={data.summary} isFetching={isFetching} />

          {/* Row 2: Stacked Bar Chart (7 cols) + Donut Chart (5 cols) */}
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ReturnTrendChart data={data.monthlyTrend} isFetching={isFetching} />
            </div>
            <div className="lg:col-span-5">
              <DamageBreakdownChart
                data={data.damageBreakdown}
                totalDamages={data.summary.totalConfirmedDamages}
                isFetching={isFetching}
              />
            </div>
          </div>

          {/* Row 3: 2-Tab Summary Table */}
          <StatisticsTables
            topDamagedVehicles={data.topDamagedVehicles}
            staffAiReviewStats={data.staffAiReviewStats}
            selectedVehicleId={vehicleId}
            onSelectVehicle={setVehicleId}
            isFetching={isFetching}
          />
        </>
      ) : null}
    </section>
  )
}
