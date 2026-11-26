import { BarChart3 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMonth } from '@/components/history/historyQuery'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { MonthlyTrendItem } from '@/types'

const DECIMAL_1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

interface ReturnTrendChartProps {
  data: MonthlyTrendItem[]
  isFetching?: boolean
}

interface TooltipPayloadItem {
  payload: MonthlyTrendItem
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

function TrendTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  const damageRate =
    point.totalReturns > 0 ? Math.round((point.damagedReturns * 1000) / point.totalReturns) / 10 : 0

  return (
    <div className="min-w-[200px] rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-sm">
      <p className="mb-2 border-b border-slate-100 pb-1.5 text-[13px] font-semibold text-slate-900">
        Tháng {formatMonth(point.month)}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Tổng lượt trả xe</span>
          <span className="font-bold text-slate-900">{point.totalReturns}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#10B981]" />
            Không hư hại
          </span>
          <span className="font-semibold text-emerald-700">{point.cleanReturns}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#EF4444]" />
            Có hư hại mới
          </span>
          <span className="font-semibold text-rose-600">{point.damagedReturns}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1.5">
          <span className="text-slate-500">Tỷ lệ hư hại</span>
          <span className="font-bold text-slate-900">{DECIMAL_1.format(damageRate)}%</span>
        </div>
      </div>
    </div>
  )
}

export function ReturnTrendChart({ data, isFetching = false }: ReturnTrendChartProps) {
  const hasAnyReturns = data.some((point) => point.totalReturns > 0)

  return (
    <Card
      className={cn(
        'flex h-full flex-col rounded-2xl border-slate-200/80 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.18)] transition-opacity',
        isFetching && 'opacity-65',
      )}
    >
      <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">Lượt trả xe 6 tháng gần nhất</CardTitle>
          <CardDescription className="mt-1 text-xs text-slate-500">
            So sánh số lượt trả xe có hư hại mới và không hư hại theo từng tháng
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#EF4444]" aria-hidden="true" />
            Có hư hại mới
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#10B981]" aria-hidden="true" />
            Không hư hại
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-3">
        {!hasAnyReturns ? (
          <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-2 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <BarChart3 className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-slate-600">
              Chưa có dữ liệu trả xe trong 6 tháng gần nhất
            </p>
          </div>
        ) : (
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 24, right: 12, left: -16, bottom: 4 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="monthLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                  dy={6}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                />
                <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.05)', radius: 8 }} />
                <Bar
                  dataKey="damagedReturns"
                  name="Có hư hại mới"
                  stackId="returns"
                  fill="#EF4444"
                  maxBarSize={44}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="cleanReturns"
                  name="Không hư hại"
                  stackId="returns"
                  fill="#10B981"
                  maxBarSize={44}
                  radius={[6, 6, 0, 0]}
                >
                  <LabelList
                    dataKey="totalReturns"
                    position="top"
                    offset={8}
                    fill="#334155"
                    fontSize={12}
                    fontWeight={600}
                    formatter={(value) => {
                      const num = Number(value)
                      return num > 0 ? String(num) : ''
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
