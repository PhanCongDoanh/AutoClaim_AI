import { cn } from '@/lib/utils'
import type { VehicleStatus } from '@/types'

const STATUS_STYLES: Record<VehicleStatus, { label: string; className: string }> = {
  AVAILABLE: { label: 'Available', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  RENTED: { label: 'Rented', className: 'bg-brand-50 text-brand-700 ring-brand-600/20' },
  MAINTENANCE: { label: 'Maintenance', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
}

interface VehicleStatusBadgeProps {
  status: VehicleStatus
  className?: string
}

export function VehicleStatusBadge({ status, className }: VehicleStatusBadgeProps) {
  const { label, className: statusClassName } = STATUS_STYLES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        statusClassName,
        className,
      )}
    >
      {label}
    </span>
  )
}
