import { cn } from '@/lib/utils'
import type { VehicleStatus } from '@/types'
import { VEHICLE_STATUS_META } from './vehicleStatus'

interface VehicleStatusBadgeProps {
  status: VehicleStatus
  className?: string
}

export function VehicleStatusBadge({ status, className }: VehicleStatusBadgeProps) {
  const { label, dotClass, badgeClass } = VEHICLE_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-[0_2px_8px_-2px_rgba(15,23,42,0.18)] backdrop-blur-sm',
        badgeClass,
        className,
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', dotClass)} aria-hidden="true" />
      {label}
    </span>
  )
}
