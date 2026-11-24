import { CircleCheck, Eye, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CarIllustration } from '@/components/vehicle/CarIllustration'
import { formatDateTime, formatShortDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InspectionHistoryItem } from '@/types'
import type { HistoryBasePath, HistoryDetailLocationState, HistoryVariant } from './historyQuery'

interface HistoryTableProps {
  items: InspectionHistoryItem[]
  /** `location.search` of the list, handed to the detail page so "Quay lại" keeps the filters. */
  historySearch: string
  /** Dims the rows while the next page loads. */
  isFetching: boolean
  /** Detail links go to `${basePath}/:checkOutSessionId`. */
  basePath: HistoryBasePath
  /** Admin adds the "NV nhận lại xe" column and shows the rejected-detection count in the badge. */
  variant: HistoryVariant
}

/** Table on md+ screens, cards below (tablet portrait / phone). */
export function HistoryTable({ items, historySearch, isFetching, basePath, variant }: HistoryTableProps) {
  const linkState: HistoryDetailLocationState = { historySearch }
  const isAdmin = variant === 'admin'
  return (
    <div className={cn('transition-opacity', isFetching && 'pointer-events-none opacity-60')} aria-busy={isFetching}>
      <div className="hidden overflow-x-auto md:block">
        <table className={cn('w-full text-sm', isAdmin ? 'min-w-[980px]' : 'min-w-[820px]')}>
          <thead>
            <tr className="border-b text-left text-[13px] text-slate-500">
              <th className="px-5 py-3 font-medium">Xe</th>
              <th className="px-3 py-3 font-medium">Khách thuê</th>
              <th className="px-3 py-3 font-medium">Nhận xe</th>
              <th className="px-3 py-3 font-medium">Trả xe</th>
              {isAdmin && <th className="px-3 py-3 font-medium">NV nhận lại xe</th>}
              <th className="px-3 py-3 font-medium">Kết quả AI</th>
              <th className="px-5 py-3">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.checkOutSessionId} className="hover:bg-slate-50/70">
                <td className="px-5 py-3">
                  <VehicleCell item={item} />
                </td>
                <td className="px-3 py-3">
                  <RenterCell item={item} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatShortDateTime(item.checkInAt)}</td>
                <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">
                  {formatDateTime(item.checkOutAt)}
                </td>
                {isAdmin && (
                  <td className="px-3 py-3">
                    <StaffCell item={item} />
                  </td>
                )}
                <td className="px-3 py-3">
                  <ResultBadge item={item} showOverridden={isAdmin} />
                </td>
                <td className="px-5 py-3 text-right">
                  <ViewButton item={item} state={linkState} basePath={basePath} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y md:hidden">
        {items.map((item) => (
          <li key={item.checkOutSessionId} className="space-y-3 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <VehicleCell item={item} />
              <ResultBadge item={item} showOverridden={isAdmin} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
              <span className="text-slate-500">Khách thuê</span>
              <span className="text-right text-slate-800">
                {item.renterName ?? '—'}
                {item.renterPhone && <span className="block text-slate-500">{item.renterPhone}</span>}
              </span>
              <span className="text-slate-500">Nhận xe</span>
              <span className="text-right text-slate-800">{formatShortDateTime(item.checkInAt)}</span>
              <span className="text-slate-500">Trả xe</span>
              <span className="text-right font-medium text-slate-900">{formatDateTime(item.checkOutAt)}</span>
              {isAdmin && (
                <>
                  <span className="text-slate-500">NV nhận lại xe</span>
                  <span className="text-right text-slate-800">
                    {item.checkOutStaffName ?? '—'}
                    {item.checkInStaffName && (
                      <span className="block text-slate-500">Giao xe: {item.checkInStaffName}</span>
                    )}
                  </span>
                </>
              )}
            </div>
            <ViewButton item={item} state={linkState} basePath={basePath} className="w-full" />
          </li>
        ))}
      </ul>
    </div>
  )
}

function VehicleCell({ item }: { item: InspectionHistoryItem }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-12 w-[72px] shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {item.avatarUrl && item.avatarUrl !== failedUrl ? (
          <img
            src={item.avatarUrl}
            alt={item.model}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setFailedUrl(item.avatarUrl)}
          />
        ) : (
          <CarIllustration seed={item.licensePlate} />
        )}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="truncate font-semibold text-slate-900" title={item.model}>
          {item.model}
        </p>
        <span className="inline-block rounded-md border bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-800">
          {item.licensePlate}
        </span>
      </div>
    </div>
  )
}

function RenterCell({ item }: { item: InspectionHistoryItem }) {
  return (
    <div className="leading-tight">
      <p className="font-medium text-slate-900">{item.renterName ?? '—'}</p>
      {item.renterPhone && <p className="mt-0.5 text-[13px] text-slate-500">{item.renterPhone}</p>}
    </div>
  )
}

/** Admin: who reviewed the AI result, with the check-in staff underneath. */
function StaffCell({ item }: { item: InspectionHistoryItem }) {
  return (
    <div className="leading-tight">
      <p className="font-medium text-slate-900">{item.checkOutStaffName ?? '—'}</p>
      {item.checkInStaffName && (
        <p className="mt-0.5 text-[13px] text-slate-500">Giao xe: {item.checkInStaffName}</p>
      )}
    </div>
  )
}

interface ResultBadgeProps {
  item: InspectionHistoryItem
  /** Admin: the rejected-detection count is shown under the badge, not only in a tooltip. */
  showOverridden: boolean
}

function ResultBadge({ item, showOverridden }: ResultBadgeProps) {
  const badge = <ResultPill item={item} withTooltip={!showOverridden} />
  if (!showOverridden || item.overriddenCount === 0) return badge
  return (
    <span className="inline-flex flex-col items-end gap-1 md:items-start">
      {badge}
      <span className="whitespace-nowrap text-xs font-medium text-amber-700">
        {item.overriddenCount} lỗi đã loại
      </span>
    </span>
  )
}

function ResultPill({ item, withTooltip }: { item: InspectionHistoryItem; withTooltip: boolean }) {
  const tooltip =
    withTooltip && item.overriddenCount > 0 ? `Đã loại ${item.overriddenCount} lỗi AI nhầm` : undefined
  const isDamaged = item.damageCount > 0
  return (
    <span
      title={tooltip}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold',
        isDamaged ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700',
        tooltip && 'cursor-help',
      )}
    >
      {isDamaged ? <TriangleAlert className="h-3.5 w-3.5" /> : <CircleCheck className="h-3.5 w-3.5" />}
      {isDamaged ? `Có hư hại (${item.damageCount})` : 'Không hư hại'}
      {tooltip && <span className="sr-only">, {tooltip.toLowerCase()}</span>}
    </span>
  )
}

interface ViewButtonProps {
  item: InspectionHistoryItem
  state: HistoryDetailLocationState
  basePath: HistoryBasePath
  className?: string
}

function ViewButton({ item, state, basePath, className }: ViewButtonProps) {
  return (
    <Button asChild variant="secondary" size="sm" className={cn('h-9 rounded-lg px-3', className)}>
      <Link to={`${basePath}/${item.checkOutSessionId}`} state={state}>
        <Eye />
        Xem
      </Link>
    </Button>
  )
}
