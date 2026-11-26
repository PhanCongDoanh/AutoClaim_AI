import { VEHICLE_STATUS_META } from '@/components/vehicle/vehicleStatus'
import { getDamageLabel } from '@/lib/damage'
import { saveBlob } from '@/lib/download'
import type { StatisticsResponse, VehicleResponse } from '@/types'

function escapeCsvCell(value: string | number): string {
  const str = String(value)
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsvRow(cells: (string | number)[]): string {
  return cells.map(escapeCsvCell).join(',')
}

interface ExportStatisticsCsvOptions {
  data: StatisticsResponse
  periodKey: string
  periodLabel: string
  selectedVehicle: VehicleResponse | null
}

/** Exports the live statistics view as a UTF-8 (with BOM) CSV report for Excel / Google Sheets. */
export function exportStatisticsCsv({
  data,
  periodKey,
  periodLabel,
  selectedVehicle,
}: ExportStatisticsCsvOptions): void {
  const { summary, monthlyTrend, damageBreakdown, topDamagedVehicles, staffAiReviewStats } = data
  const vehicleScope = selectedVehicle
    ? `${selectedVehicle.model} (${selectedVehicle.licensePlate})`
    : 'Tất cả xe'
  const cleanRatePercent =
    summary.totalReturns > 0
      ? Math.round((summary.cleanReturns * 1000) / summary.totalReturns) / 10
      : 0
  const avgDamages =
    summary.damagedReturns > 0
      ? (summary.totalConfirmedDamages / summary.damagedReturns).toFixed(2)
      : '0'
  const hasPartData = topDamagedVehicles.some((v) => Boolean(v.mostCommonPart))

  const lines: string[] = [
    toCsvRow(['BÁO CÁO THỐNG KÊ KIỂM ĐỊNH - AUTOCLAIM AI']),
    toCsvRow(['Kỳ báo cáo', periodLabel]),
    toCsvRow(['Phạm vi xe', vehicleScope]),
    '',
    toCsvRow(['1. CHỈ SỐ TỔNG QUAN (KPI)']),
    toCsvRow(['Chỉ số', 'Giá trị', 'Chi tiết']),
    toCsvRow([
      'Tỷ lệ có hư hại mới',
      `${summary.damageRatePercent}%`,
      `${summary.damagedReturns} / ${summary.totalReturns} lượt trả xe hoàn tất`,
    ]),
    toCsvRow([
      'Hư hại mới ghi nhận',
      summary.totalConfirmedDamages,
      summary.damagedReturns > 0
        ? `Trung bình ${avgDamages} lỗi / lượt có hư hại`
        : 'Chưa phát sinh hư hại mới',
    ]),
    toCsvRow([
      'Độ chính xác AI',
      `${summary.aiAccuracyPercent}%`,
      `${summary.rejectedAiCount} / ${summary.totalAiDetections} phát hiện bị đánh dấu AI nhầm`,
    ]),
    toCsvRow([
      'Lượt trả xe hoàn tất',
      summary.totalReturns,
      `${summary.cleanReturns} lượt không phát sinh hư hại (${cleanRatePercent}%)`,
    ]),
    '',
    toCsvRow(['2. XU HƯỚNG LƯỢT TRẢ XE 6 THÁNG GẦN NHẤT']),
    toCsvRow(['Tháng', 'Tổng lượt', 'Không hư hại', 'Có hư hại mới', 'Tỷ lệ hư hại (%)']),
    ...monthlyTrend.map((point) => {
      const rate =
        point.totalReturns > 0
          ? Math.round((point.damagedReturns * 1000) / point.totalReturns) / 10
          : 0
      return toCsvRow([
        point.month,
        point.totalReturns,
        point.cleanReturns,
        point.damagedReturns,
        `${rate}%`,
      ])
    }),
    '',
    toCsvRow(['3. CƠ CẤU LOẠI HƯ HẠI']),
    toCsvRow(['Loại hư hại', 'Số lượng', 'Tỷ lệ (%)']),
    ...damageBreakdown.map((item) =>
      toCsvRow([item.damageLabel || getDamageLabel(item.damageType), item.count, `${item.percentage}%`]),
    ),
    toCsvRow([
      'Tổng',
      summary.totalConfirmedDamages,
      summary.totalConfirmedDamages > 0 ? '100%' : '0%',
    ]),
    '',
    toCsvRow(['4. XE CÓ NHIỀU HƯ HẠI NHẤT']),
    toCsvRow(
      hasPartData
        ? ['STT', 'Dòng xe', 'Biển số', 'Số hư hại mới', 'Loại thường gặp', 'Bộ phận hay hỏng', 'Trạng thái']
        : ['STT', 'Dòng xe', 'Biển số', 'Số hư hại mới', 'Loại thường gặp', 'Trạng thái'],
    ),
    ...topDamagedVehicles.map((vehicle, index) => {
      const damageLabel = vehicle.mostCommonDamageType ? getDamageLabel(vehicle.mostCommonDamageType) : ''
      const statusLabel = VEHICLE_STATUS_META[vehicle.status]?.label ?? vehicle.status
      return toCsvRow(
        hasPartData
          ? [
              index + 1,
              vehicle.model,
              vehicle.licensePlate,
              vehicle.totalConfirmedDamages,
              damageLabel,
              vehicle.mostCommonPart ?? '',
              statusLabel,
            ]
          : [
              index + 1,
              vehicle.model,
              vehicle.licensePlate,
              vehicle.totalConfirmedDamages,
              damageLabel,
              statusLabel,
            ],
      )
    }),
    '',
    toCsvRow(['5. GIÁM SÁT XÁC NHẬN AI THEO NHÂN VIÊN']),
    toCsvRow([
      'Nhân viên',
      'Lượt nhận lại xe',
      'Lỗi AI phát hiện',
      'Đã đánh dấu "AI nhầm"',
      'Tỷ lệ bác bỏ AI (%)',
    ]),
    ...staffAiReviewStats.map((staff) =>
      toCsvRow([
        staff.staffName,
        staff.totalReturns,
        staff.totalAiDetections,
        staff.rejectedAiCount,
        `${staff.rejectionRatePercent}%`,
      ]),
    ),
  ]

  const csvContent = `\uFEFF${lines.join('\r\n')}`
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const safeVehicle = selectedVehicle
    ? `-${selectedVehicle.licensePlate.replace(/[^a-zA-Z0-9]/g, '')}`
    : ''
  saveBlob(blob, `autoclaim-thong-ke-${periodKey}${safeVehicle}.csv`)
}
