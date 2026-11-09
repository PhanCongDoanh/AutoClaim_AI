import { cn } from '@/lib/utils'
import type { VehicleStatus } from '@/types'
import { VEHICLE_STATUS_META } from './vehicleStatus'

interface VehicleStatusBadgeProps {
  status: VehicleStatus
  className?: string
}

export function VehicleStatusBadge({ status, className }: VehicleStatusBadgeProps) {
  const { label, dotClass, textClass } = VEHICLE_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs font-medium shadow-sm',
        textClass,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} aria-hidden="true" />
      {label}
    </span>
  )
}
