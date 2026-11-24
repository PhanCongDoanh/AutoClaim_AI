import { CircleCheck, ClipboardList, SearchX, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { InspectionHistorySummary } from '@/types'

const PERCENT = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 })

function formatRate(part: number, total: number): string {
  return PERCENT.format(total > 0 ? part / total : 0)
}

interface HistorySummaryCardsProps {
  summary: InspectionHistorySummary | null
  /** First load: placeholders instead of numbers. */
  isLoading: boolean
  /** Refetching after a filter change: dim the previous numbers. */
  isFetching: boolean
}

/**
 * Admin: 4 cards over the current search / month / staff scope (the result and override filters don't apply, so the
 * cards keep the overall picture while the table is narrowed).
 */
export function HistorySummaryCards({ summary, isLoading, isFetching }: HistorySummaryCardsProps) {
  return (
    <div
      className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', isFetching && !isLoading && 'opacity-60')}
      aria-busy={isLoading || isFetching}
    >
      <SummaryCard
        icon={ClipboardList}
        tone="brand"
        label="Lượt trả xe"
        value={summary?.totalReturns}
        isLoading={isLoading}
      />
      <SummaryCard
        icon={TriangleAlert}
        tone="red"
        label="Có hư hại"
        value={summary?.damagedReturns}
        suffix={summary ? formatRate(summary.damagedReturns, summary.totalReturns) : undefined}
        isLoading={isLoading}
      />
      <SummaryCard
        icon={CircleCheck}
        tone="green"
        label="Không hư hại"
        value={summary?.cleanReturns}
        suffix={summary ? formatRate(summary.cleanReturns, summary.totalReturns) : undefined}
        isLoading={isLoading}
      />
      <SummaryCard
        icon={SearchX}
        tone="amber"
        label="Lỗi AI bị loại"
        value={summary ? `${summary.overriddenDetections}/${summary.aiDetections}` : undefined}
        suffix={summary ? PERCENT.format(summary.overrideRate) : undefined}
        note="tỷ lệ AI báo nhầm theo xác nhận của nhân viên"
        isLoading={isLoading}
      />
    </div>
  )
}

const TONES = {
  brand: 'bg-[#e9f0fd] text-brand-600',
  red: 'bg-red-50 text-red-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
} as const

interface SummaryCardProps {
  icon: LucideIcon
  tone: keyof typeof TONES
  label: string
  value: ReactNode
  /** Shown after the value, e.g. "39,1%". */
  suffix?: string
  note?: string
  isLoading: boolean
}

function SummaryCard({ icon: Icon, tone, label, value, suffix, note, isLoading }: SummaryCardProps) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-slate-500">{label}</p>
        {isLoading || value === undefined ? (
          <div className="h-7 w-20 animate-pulse rounded bg-slate-100" />
        ) : (
          <p className="flex flex-wrap items-baseline gap-x-2 text-2xl font-semibold text-slate-900">
            {value}
            {suffix && <span className="text-sm font-medium text-slate-500">{suffix}</span>}
          </p>
        )}
        {note && <p className="text-xs text-slate-500">{note}</p>}
      </div>
    </Card>
  )
}
