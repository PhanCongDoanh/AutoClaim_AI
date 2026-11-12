import { Camera, Check, ScanLine, User, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatShortDateTime, getDueState } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VehicleResponse } from '@/types'
import { CarIllustration } from './CarIllustration'
import { VehicleStatusBadge } from './VehicleStatusBadge'

interface VehicleCardProps {
  vehicle: VehicleResponse
  /** Rendered in the top-right corner of the image (e.g. an actions dropdown). */
  menu?: ReactNode
  /** Replaces the default staff actions (check-in link / check-out button) in the footer. */
  actions?: ReactNode
  /**
   * Rented vehicles: clicking the card or its "Check-out" button calls this (e.g. to open a details
   * sheet). Without it the button links straight to the check-out page.
   */
  onSelect?: (vehicle: VehicleResponse) => void
  /** Highlights the card (e.g. while its details sheet is open). */
  selected?: boolean
}

export function VehicleCard({ vehicle, menu, actions, onSelect, selected = false }: VehicleCardProps) {
  const { vehicleId, model, licensePlate, seats, status, avatarUrl } = vehicle
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const isRented = status === 'RENTED'
  const canSelect = isRented && Boolean(onSelect)
  const dueState = getDueState(vehicle.expectedReturnAt)

  return (
    <Card
      className={cn(
        'relative flex flex-col overflow-hidden transition-shadow',
        canSelect && 'cursor-pointer hover:shadow-md',
        selected && 'ring-2 ring-primary ring-offset-2',
      )}
      // Mouse convenience only; keyboard users use the footer button.
      onClick={canSelect ? () => onSelect?.(vehicle) : undefined}
    >
      <div className="relative aspect-[16/9] bg-slate-100">
        {avatarUrl && avatarUrl !== failedUrl ? (
          <img
            src={avatarUrl}
            alt={model}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setFailedUrl(avatarUrl)}
          />
        ) : (
          <CarIllustration seed={vehicleId} />
        )}
        <VehicleStatusBadge status={status} className="absolute left-3 top-3" />
        {menu && <div className="absolute right-3 top-3">{menu}</div>}
        {selected && !menu && (
          <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-2">
          <h3 className="font-semibold leading-tight text-foreground">{model}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded border bg-secondary px-1.5 py-0.5 font-mono text-foreground">
              {licensePlate}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {seats} chỗ
            </span>
          </div>
        </div>

        {isRented && (vehicle.renterName || vehicle.expectedReturnAt) && (
          <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-2">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{vehicle.renterName ?? '—'}</span>
            </span>
            {vehicle.expectedReturnAt && (
              <span
                className={cn(
                  'shrink-0 whitespace-nowrap',
                  dueState === 'overdue' && 'font-medium text-red-600',
                  dueState === 'soon' && 'font-medium text-amber-700',
                )}
              >
                {dueState === 'overdue' ? 'Quá hạn · ' : 'Trả '}
                {formatShortDateTime(vehicle.expectedReturnAt)}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto">
          {actions ?? (
            <>
              {status === 'AVAILABLE' && (
                <Button asChild variant="secondary" size="sm" className="w-full">
                  <Link to={`/staff/check-in?vehicleId=${vehicleId}`}>
                    <Camera />
                    Chọn xe · Check-in
                  </Link>
                </Button>
              )}
              {isRented && vehicle.activeBookingId && (
                onSelect ? (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelect(vehicle)
                    }}
                  >
                    <ScanLine />
                    Nhận lại xe · Check-out
                  </Button>
                ) : (
                  <Button asChild size="sm" className="w-full">
                    <Link to={`/staff/check-out?bookingId=${vehicle.activeBookingId}`}>
                      <ScanLine />
                      Nhận lại xe · Check-out
                    </Link>
                  </Button>
                )
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
