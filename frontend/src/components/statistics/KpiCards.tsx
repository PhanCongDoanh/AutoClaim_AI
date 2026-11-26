import { ClipboardCheck, ShieldAlert, Sparkles, Wrench } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { StatisticsSummary } from '@/types'

const DECIMAL_1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const DECIMAL_2 = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const INTEGER = new Intl.NumberFormat('vi-VN')

function formatPercent(value: number): string {
  return `${DECIMAL_1.format(value)}%`
}

interface KpiCardsProps {
  summary: StatisticsSummary
  isFetching?: boolean
}

export function KpiCards({ summary, isFetching = false }: KpiCardsProps) {
  const cleanRatePercent =
    summary.totalReturns > 0
      ? Math.round((summary.cleanReturns * 1000) / summary.totalReturns) / 10
      : 0
  const avgDamagesPerDamagedReturn =
    summary.damagedReturns > 0 ? summary.totalConfirmedDamages / summary.damagedReturns : 0

  const accuracyBarTone =
    summary.totalAiDetections === 0
      ? 'bg-slate-200'
      : summary.aiAccuracyPercent >= 85
        ? 'bg-emerald-500'
        : summary.aiAccuracyPercent >= 75
          ? 'bg-brand-600'
          : 'bg-amber-500'

  return (
    <div
      className={cn(
        'grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-4',
        isFetching && 'opacity-65',
      )}
    >
      {/* 1. Tỷ lệ có hư hại mới */}
      <Card className="flex flex-col justify-between rounded-2xl border-slate-200/80 p-5 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-medium text-slate-500">Tỷ lệ có hư hại mới</p>
            <p className="text-[30px] font-bold leading-none tracking-tight text-slate-900">
              {formatPercent(summary.damageRatePercent)}
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <ShieldAlert className="h-5 w-5" strokeWidth={2} />
          </span>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-xs font-medium text-slate-500">
            <span className="font-semibold text-slate-700">
              {INTEGER.format(summary.damagedReturns)}
            </span>{' '}
            / {INTEGER.format(summary.totalReturns)} lượt trả xe hoàn tất
          </p>
          <p className="text-[11px] text-slate-400">
            Tính trên các lượt có ít nhất 1 hư hại mới xác nhận
          </p>
        </div>
      </Card>

      {/* 2. Hư hại mới ghi nhận */}
      <Card className="flex flex-col justify-between rounded-2xl border-slate-200/80 p-5 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-medium text-slate-500">Hư hại mới ghi nhận</p>
            <p className="text-[30px] font-bold leading-none tracking-tight text-slate-900">
              {INTEGER.format(summary.totalConfirmedDamages)}
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Wrench className="h-5 w-5" strokeWidth={2} />
          </span>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-xs font-medium text-slate-500">
            {summary.damagedReturns > 0 ? (
              <>
                Trung bình{' '}
                <span className="font-semibold text-slate-700">
                  {DECIMAL_2.format(avgDamagesPerDamagedReturn)} lỗi
                </span>{' '}
                / lượt có hư hại
              </>
            ) : (
              'Chưa phát sinh hư hại mới trong kỳ'
            )}
          </p>
          <p className="text-[11px] text-slate-400">
            Không tính lỗi đã đánh dấu &ldquo;AI nhầm&rdquo;
          </p>
        </div>
      </Card>

      {/* 3. Độ chính xác AI */}
      <Card className="flex flex-col justify-between rounded-2xl border-slate-200/80 p-5 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-medium text-slate-500">Độ chính xác AI</p>
            <p className="text-[30px] font-bold leading-none tracking-tight text-slate-900">
              {formatPercent(summary.aiAccuracyPercent)}
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e9f0fd] text-brand-600">
            <Sparkles className="h-5 w-5" strokeWidth={2} />
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-slate-500">
            {summary.totalAiDetections > 0 ? (
              <>
                <span className="font-semibold text-slate-700">
                  {INTEGER.format(summary.rejectedAiCount)}
                </span>{' '}
                / {INTEGER.format(summary.totalAiDetections)} phát hiện bị đánh dấu AI nhầm
              </>
            ) : (
              'Chưa có phát hiện AI nào trong kỳ'
            )}
          </p>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={Math.round(summary.aiAccuracyPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Độ chính xác AI"
          >
            <div
              className={cn('h-full rounded-full transition-all duration-500', accuracyBarTone)}
              style={{
                width: `${Math.min(100, Math.max(0, summary.aiAccuracyPercent))}%`,
              }}
            />
          </div>
        </div>
      </Card>

      {/* 4. Lượt trả xe hoàn tất */}
      <Card className="flex flex-col justify-between rounded-2xl border-slate-200/80 p-5 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-medium text-slate-500">Lượt trả xe hoàn tất</p>
            <p className="text-[30px] font-bold leading-none tracking-tight text-slate-900">
              {INTEGER.format(summary.totalReturns)}
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ClipboardCheck className="h-5 w-5" strokeWidth={2} />
          </span>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-xs font-medium text-slate-500">
            <span className="font-semibold text-emerald-700">
              {INTEGER.format(summary.cleanReturns)} lượt
            </span>{' '}
            không phát sinh hư hại ({formatPercent(cleanRatePercent)})
          </p>
          <p className="text-[11px] text-slate-400">Phiên kiểm định đã hoàn tất đối chiếu AI</p>
        </div>
      </Card>
    </div>
  )
}
