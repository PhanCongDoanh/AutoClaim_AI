import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDamageLabel } from '@/lib/damage'
import { cn } from '@/lib/utils'
import type { DamageBreakdownItem } from '@/types'

const DECIMAL_1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const INTEGER = new Intl.NumberFormat('vi-VN')

/** Consistent color mapping for AI damage classes. */
const DAMAGE_COLORS: Record<string, string> = {
  scratch: '#2563EB', // Trầy xước
  dent: '#F59E0B', // Móp méo
  crack: '#EF4444', // Nứt
  glass_shatter: '#8B5CF6', // Vỡ kính
  lamp_broken: '#EC4899', // Vỡ đèn
  tire_flat: '#06B6D4', // Xẹp lốp
}

const FALLBACK_COLORS = ['#2563EB', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']

function getColor(damageType: string, index: number): string {
  return DAMAGE_COLORS[damageType] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

interface DamageBreakdownChartProps {
  data: DamageBreakdownItem[]
  totalDamages: number
  isFetching?: boolean
}

interface ChartEntry extends DamageBreakdownItem {
  displayLabel: string
  fill: string
}

interface TooltipPayloadItem {
  payload: ChartEntry
}

interface DonutTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

function DonutTooltip({ active, payload }: DonutTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 font-semibold text-slate-900">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
        <span>{item.displayLabel}</span>
      </div>
      <p className="mt-1 text-slate-600">
        <strong className="text-slate-900">{INTEGER.format(item.count)}</strong> lỗi (
        {DECIMAL_1.format(item.percentage)}%)
      </p>
    </div>
  )
}

export function DamageBreakdownChart({
  data,
  totalDamages,
  isFetching = false,
}: DamageBreakdownChartProps) {
  const chartData: ChartEntry[] = data
    .filter((item) => item.count > 0)
    .map((item, index) => ({
      ...item,
      displayLabel: item.damageLabel || getDamageLabel(item.damageType),
      fill: getColor(item.damageType, index),
    }))

  return (
    <Card
      className={cn(
        'flex h-full flex-col rounded-2xl border-slate-200/80 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.18)] transition-opacity',
        isFetching && 'opacity-65',
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-slate-900">Cơ cấu loại hư hại</CardTitle>
        <CardDescription className="mt-1 text-xs text-slate-500">
          Phân bổ theo các loại hư hại ngoại thất đã được xác nhận
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-center pt-3">
        {totalDamages === 0 || chartData.length === 0 ? (
          <div className="flex min-h-[260px] flex-1 flex-col items-center justify-center gap-4 text-center">
            <div
              className="flex h-[168px] w-[168px] flex-col items-center justify-center rounded-full border-[24px] border-slate-100 bg-white"
              aria-hidden="true"
            >
              <span className="text-2xl font-bold leading-none text-slate-400">0</span>
              <span className="mt-1 text-[11px] font-medium text-slate-400">hư hại</span>
            </div>
            <p className="max-w-[240px] text-sm font-medium text-slate-500">
              Chưa phát sinh hư hại trong kỳ này
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center lg:flex-col xl:flex-row">
            {/* Donut chart */}
            <div className="relative h-[200px] w-[200px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="displayLabel"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={chartData.length > 1 ? 2.5 : 0}
                    strokeWidth={0}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.damageType} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold leading-none text-slate-900">
                  {INTEGER.format(totalDamages)}
                </span>
                <span className="mt-1 text-[11px] font-medium text-slate-500">hư hại mới</span>
              </div>
            </div>

            {/* Aligned legend list */}
            <div className="w-full min-w-0 flex-1">
              <ul className="space-y-2 text-[13px]">
                {chartData.map((item) => (
                  <li
                    key={item.damageType}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.fill }}
                        aria-hidden="true"
                      />
                      <span className="truncate text-slate-700">{item.displayLabel}</span>
                    </span>
                    <span className="text-right font-bold tabular-nums text-slate-900">
                      {INTEGER.format(item.count)}
                    </span>
                    <span className="w-12 text-right text-xs font-medium tabular-nums text-slate-500">
                      {DECIMAL_1.format(item.percentage)}%
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-slate-100 pt-2.5 text-[13px]">
                <span className="font-semibold text-slate-900">Tổng</span>
                <span className="text-right font-bold tabular-nums text-slate-900">
                  {INTEGER.format(totalDamages)}
                </span>
                <span className="w-12 text-right text-xs font-semibold tabular-nums text-slate-700">
                  100%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
