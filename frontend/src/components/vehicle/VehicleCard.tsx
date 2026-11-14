import { Camera, Car, LogOut, Phone, User, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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

/** Classes for the full-width tinted action button at the bottom of a card. */
export const VEHICLE_CARD_ACTION_CLASS =
  'h-10 w-full rounded-xl bg-[#e4ecfc] text-[14px] font-semibold text-brand-700 hover:bg-[#d7e3fb] [&_svg]:size-[18px]'

export function VehicleCard({ vehicle, menu, actions }: VehicleCardProps) {
  const { vehicleId, model, licensePlate, seats, status, avatarUrl } = vehicle
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  return (
    <div className="group/card flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_4px_16px_-8px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-16px_rgba(30,64,175,0.35)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {avatarUrl && avatarUrl !== failedUrl ? (
          <img
            src={avatarUrl}
            alt={model}
            className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-[1.03]"
            loading="lazy"
            onError={() => setFailedUrl(avatarUrl)}
          />
        ) : (
          <CarIllustration seed={vehicleId} />
        )}
        <VehicleStatusBadge status={status} className="absolute left-2.5 top-2.5" />
        {menu && <div className="absolute right-2.5 top-2.5">{menu}</div>}
      </div>

      <div className="flex flex-1 flex-col gap-3.5 px-3.5 pb-3.5 pt-3">
        <div className="space-y-2.5">
          <h3 className="truncate text-[17px] font-bold leading-tight text-slate-900" title={model}>
            {model}
          </h3>
          <div className="flex items-center gap-3 text-[13px]">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#eef2f8] px-2.5 py-1 font-bold text-slate-800">
              <Car className="h-3.5 w-3.5 text-slate-600" strokeWidth={2.2} />
              {licensePlate}
            </span>
            <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <Users className="h-3.5 w-3.5 text-slate-500" strokeWidth={2.2} />
              {seats} chỗ
            </span>
          </div>
        </div>

        {status === 'RENTED' && vehicle.renterName && (
          <div className="space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-slate-400" />
              {vehicle.renterName}
            </p>
            {vehicle.renterPhone && (
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {vehicle.renterPhone}
              </p>
            )}
          </div>
        )}

        <div className="mt-auto">
          {actions ?? (
            <>
              {status === 'AVAILABLE' && (
                <Button asChild variant="soft" className={VEHICLE_CARD_ACTION_CLASS}>
                  {/* Selecting a car = navigating to the Check-in tab with its id; CheckIn reads `vehicleId`. */}
                  <Link to={`/staff/check-in?vehicleId=${vehicleId}`}>
                    <Camera />
                    Chọn xe · Check-in
                  </Link>
                </Button>
              )}
              {status === 'RENTED' && vehicle.activeBookingId && (
                <Button asChild variant="soft" className={VEHICLE_CARD_ACTION_CLASS}>
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
    </div>
  )
}
