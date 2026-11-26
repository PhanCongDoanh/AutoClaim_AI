import { AlertTriangle, Car, CheckCircle2, Filter, ShieldAlert, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CarIllustration } from '@/components/vehicle/CarIllustration'
import { VEHICLE_STATUS_META } from '@/components/vehicle/vehicleStatus'
import { getDamageLabel } from '@/lib/damage'
import { getInitials } from '@/lib/people'
import { cn } from '@/lib/utils'
import type { StaffAiReviewStatItem, TopDamagedVehicleItem, UUID } from '@/types'

const DECIMAL_1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const INTEGER = new Intl.NumberFormat('vi-VN')

/** Threshold (%) above which a staff member's AI rejection rate triggers an admin warning badge. */
const HIGH_OVERRIDE_RATE_THRESHOLD = 25

interface StatisticsTablesProps {
  topDamagedVehicles: TopDamagedVehicleItem[]
  staffAiReviewStats: StaffAiReviewStatItem[]
  selectedVehicleId: UUID | null
  onSelectVehicle: (vehicleId: UUID | null) => void
  isFetching?: boolean
}

export function StatisticsTables({
  topDamagedVehicles,
  staffAiReviewStats,
  selectedVehicleId,
  onSelectVehicle,
  isFetching = false,
}: StatisticsTablesProps) {
  const highOverrideCount = staffAiReviewStats.filter(
    (staff) => staff.totalAiDetections > 0 && staff.rejectionRatePercent > HIGH_OVERRIDE_RATE_THRESHOLD,
  ).length

  // Only show the "Bộ phận hay hỏng" column when the database actually has part_name data.
  const showPartColumn = topDamagedVehicles.some((vehicle) => Boolean(vehicle.mostCommonPart))

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-2xl border-slate-200/80 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.18)] transition-opacity',
        isFetching && 'opacity-65',
      )}
    >
      <Tabs defaultValue="top-vehicles" className="w-full">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-auto w-full justify-start rounded-xl bg-slate-100/90 p-1 sm:w-auto">
            <TabsTrigger
              value="top-vehicles"
              className="flex-1 rounded-lg px-3.5 py-2 text-[13px] font-semibold sm:flex-initial"
            >
              <Car className="h-4 w-4" />
              Xe có nhiều hư hại nhất
              <span className="ml-1 rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">
                {topDamagedVehicles.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="staff-ai"
              className="flex-1 rounded-lg px-3.5 py-2 text-[13px] font-semibold sm:flex-initial"
            >
              <UserCheck className="h-4 w-4" />
              Giám sát xác nhận AI theo nhân viên
              {highOverrideCount > 0 && (
                <span
                  className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800"
                  title={`${highOverrideCount} nhân viên có tỷ lệ bác bỏ AI trên 25%`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {highOverrideCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {selectedVehicleId && (
            <button
              type="button"
              onClick={() => onSelectVehicle(null)}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 sm:self-auto"
            >
              <Filter className="h-3.5 w-3.5" />
              Đang lọc theo 1 xe · Bấm để xem tất cả
            </button>
          )}
        </div>

        {/* Tab 1: Top Damaged Vehicles */}
        <TabsContent value="top-vehicles" className="mt-0">
          {topDamagedVehicles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-slate-700">
                Không có xe nào phát sinh hư hại mới trong kỳ đã chọn
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="w-12 px-5 py-3 text-center">#</th>
                      <th className="px-3 py-3">Xe</th>
                      <th className="px-3 py-3 text-right">Số hư hại mới</th>
                      <th className="px-3 py-3">Loại thường gặp</th>
                      {showPartColumn && <th className="px-3 py-3">Bộ phận hay hỏng</th>}
                      <th className="px-5 py-3 text-right">Trạng thái hiện tại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topDamagedVehicles.map((vehicle, index) => {
                      const isSelected = selectedVehicleId === vehicle.vehicleId
                      return (
                        <tr
                          key={vehicle.vehicleId}
                          onClick={() => onSelectVehicle(isSelected ? null : vehicle.vehicleId)}
                          title={
                            isSelected
                              ? 'Bấm để bỏ lọc xe này'
                              : `Bấm để lọc nhanh thống kê cho xe ${vehicle.licensePlate}`
                          }
                          className={cn(
                            'cursor-pointer transition-colors hover:bg-blue-50/40',
                            isSelected && 'bg-brand-50/70',
                          )}
                        >
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={cn(
                                'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                                index === 0
                                  ? 'bg-rose-100 text-rose-700'
                                  : index === 1
                                    ? 'bg-amber-100 text-amber-700'
                                    : index === 2
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-slate-100 text-slate-600',
                              )}
                            >
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <VehicleRowCell vehicle={vehicle} isSelected={isSelected} />
                          </td>
                          <td className="px-3 py-3.5 text-right">
                            <span className="inline-flex items-baseline gap-1 font-bold tabular-nums text-slate-900">
                              {INTEGER.format(vehicle.totalConfirmedDamages)}
                              <span className="text-xs font-normal text-slate-400">
                                ({vehicle.damagedReturns} lượt)
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            {vehicle.mostCommonDamageType && (
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                {getDamageLabel(vehicle.mostCommonDamageType)}
                              </span>
                            )}
                          </td>
                          {showPartColumn && (
                            <td className="px-3 py-3.5 font-medium text-slate-700">
                              {vehicle.mostCommonPart ?? '—'}
                            </td>
                          )}
                          <td className="px-5 py-3.5 text-right">
                            <StatusPill status={vehicle.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-2.5 text-xs text-slate-500">
                Mẹo: Bấm vào một dòng xe bất kỳ để lọc nhanh toàn bộ biểu đồ và chỉ số KPI theo xe đó.
              </div>
            </>
          )}
        </TabsContent>

        {/* Tab 2: Staff AI Review Monitoring */}
        <TabsContent value="staff-ai" className="mt-0">
          {staffAiReviewStats.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <UserCheck className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-slate-700">
                Chưa có lượt nhận lại xe nào trong kỳ đã chọn
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Nhân viên</th>
                      <th className="px-3 py-3 text-right">Lượt nhận lại xe</th>
                      <th className="px-3 py-3 text-right">Lỗi AI phát hiện</th>
                      <th className="px-3 py-3 text-right">Đã đánh dấu &ldquo;AI nhầm&rdquo;</th>
                      <th className="px-5 py-3 text-right">Tỷ lệ bác bỏ AI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffAiReviewStats.map((staff) => {
                      const isHighOverride =
                        staff.totalAiDetections > 0 &&
                        staff.rejectionRatePercent > HIGH_OVERRIDE_RATE_THRESHOLD
                      return (
                        <tr
                          key={staff.staffId ?? staff.staffName}
                          className={cn(
                            'transition-colors hover:bg-slate-50/70',
                            isHighOverride && 'bg-amber-50/35 hover:bg-amber-50/60',
                          )}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9f0fd] text-xs font-bold text-brand-700">
                                {getInitials(staff.staffName)}
                              </span>
                              <p className="truncate font-semibold text-slate-900">{staff.staffName}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-slate-800">
                            {INTEGER.format(staff.totalReturns)}
                          </td>
                          <td className="px-3 py-3.5 text-right font-medium tabular-nums text-slate-700">
                            {INTEGER.format(staff.totalAiDetections)}
                          </td>
                          <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-slate-900">
                            {INTEGER.format(staff.rejectedAiCount)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              <span
                                className={cn(
                                  'font-bold tabular-nums',
                                  isHighOverride ? 'text-rose-600' : 'text-slate-900',
                                )}
                              >
                                {DECIMAL_1.format(staff.rejectionRatePercent)}%
                              </span>
                              {isHighOverride && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700"
                                  title="Tỷ lệ bác bỏ AI vượt ngưỡng 25% — Quản trị viên nên kiểm tra lại các phiên kiểm định"
                                >
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                  Cần kiểm tra
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-2.5 text-xs text-slate-500">
                Cảnh báo tự động hiển thị khi tỷ lệ nhân viên bác bỏ phát hiện của AI vượt quá{' '}
                <strong className="text-slate-700">{HIGH_OVERRIDE_RATE_THRESHOLD}%</strong>.
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}

function VehicleRowCell({
  vehicle,
  isSelected,
}: {
  vehicle: TopDamagedVehicleItem
  isSelected: boolean
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-11 w-[68px] shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {vehicle.avatarUrl && vehicle.avatarUrl !== failedUrl ? (
          <img
            src={vehicle.avatarUrl}
            alt={vehicle.model}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setFailedUrl(vehicle.avatarUrl)}
          />
        ) : (
          <CarIllustration seed={vehicle.licensePlate} />
        )}
      </div>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-slate-900" title={vehicle.model}>
            {vehicle.model}
          </p>
          {isSelected && (
            <span className="shrink-0 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Đang lọc
            </span>
          )}
        </div>
        <span className="inline-block rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-700">
          {vehicle.licensePlate}
        </span>
      </div>
    </div>
  )
}

const STATUS_PILL_STYLES = {
  AVAILABLE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  RENTED: 'border-amber-200 bg-amber-50 text-amber-700',
  MAINTENANCE: 'border-rose-200 bg-rose-50 text-rose-700',
} as const

function StatusPill({ status }: { status: TopDamagedVehicleItem['status'] }) {
  const meta = VEHICLE_STATUS_META[status]
  if (!meta) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold',
        STATUS_PILL_STYLES[status],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dotClass)} aria-hidden="true" />
      {meta.label}
    </span>
  )
}
