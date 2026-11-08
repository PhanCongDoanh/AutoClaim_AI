import { Car, LogIn, LogOut, Phone, User, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { VehicleResponse } from '@/types'
import { VehicleStatusBadge } from './VehicleStatusBadge'

interface VehicleCardProps {
  vehicle: VehicleResponse
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const { vehicleId, model, licensePlate, seats, status, avatarUrl } = vehicle

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="aspect-video bg-muted">
        {avatarUrl ? (
          <img src={avatarUrl} alt={model} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Car className="h-10 w-10" />
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{model}</CardTitle>
          <VehicleStatusBadge status={status} />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="rounded border bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground">
            {licensePlate}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {seats} seats
          </span>
        </div>
      </CardHeader>

      {status === 'RENTED' && vehicle.renterName && (
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p className="inline-flex items-center gap-2">
            <User className="h-3.5 w-3.5" />
            {vehicle.renterName}
          </p>
          {vehicle.renterPhone && (
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              {vehicle.renterPhone}
            </p>
          )}
        </CardContent>
      )}

      <CardFooter className="mt-auto">
        {status === 'AVAILABLE' && (
          <Button asChild className="w-full">
            <Link to={`/staff/check-in?vehicleId=${vehicleId}`}>
              <LogIn />
              Check in
            </Link>
          </Button>
        )}
        {status === 'RENTED' && vehicle.activeBookingId && (
          <Button asChild variant="secondary" className="w-full">
            <Link to={`/staff/check-out?bookingId=${vehicle.activeBookingId}`}>
              <LogOut />
              Check out
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
