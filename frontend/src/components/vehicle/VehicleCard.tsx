import { Camera, LogOut, Phone, User, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { VehicleResponse } from '@/types'
import { CarIllustration } from './CarIllustration'
import { VehicleStatusBadge } from './VehicleStatusBadge'

interface VehicleCardProps {
  vehicle: VehicleResponse
  /** Rendered in the top-right corner of the image (e.g. an actions dropdown). */
  menu?: ReactNode
  /** Replaces the default staff actions (check-in / check-out links) in the footer. */
  actions?: ReactNode
}

export function VehicleCard({ vehicle, menu, actions }: VehicleCardProps) {
  const { vehicleId, model, licensePlate, seats, status, avatarUrl } = vehicle
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  return (
    <Card className="flex flex-col overflow-hidden">
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

        {status === 'RENTED' && vehicle.renterName && (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              {vehicle.renterName}
            </p>
            {vehicle.renterPhone && (
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                {vehicle.renterPhone}
              </p>
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
              {status === 'RENTED' && vehicle.activeBookingId && (
                <Button asChild variant="secondary" size="sm" className="w-full">
                  <Link to={`/staff/check-out?bookingId=${vehicle.activeBookingId}`}>
                    <LogOut />
                    Check-out
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
