import { AlertCircle, CalendarClock, CalendarPlus, ImageOff, RotateCw, ScanLine, User } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ANGLE_LABELS, ID_CARD_PHOTO_KEYS, VEHICLE_PHOTO_KEYS } from '@/components/inspection/photoAngles'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { CarIllustration } from '@/components/vehicle/CarIllustration'
import { VehicleStatusBadge } from '@/components/vehicle/VehicleStatusBadge'
import { useSessionResults } from '@/hooks/useSessionResults'
import { formatDateTime, getDueState } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AngleCode, ImageResult, VehicleResponse } from '@/types'

interface RentedVehicleSheetProps {
  /** The rented vehicle to show; null closes the sheet. */
  vehicle: VehicleResponse | null
  onOpenChange: (open: boolean) => void
}

/** Mockup 06: renter, ID card, rental times and check-in photos of a rented vehicle, before check-out. */
export function RentedVehicleSheet({ vehicle, onOpenChange }: RentedVehicleSheetProps) {
  return (
    <Sheet open={Boolean(vehicle)} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        {vehicle && <RentedVehicleDetails key={vehicle.vehicleId} vehicle={vehicle} />}
      </SheetContent>
    </Sheet>
  )
}

function RentedVehicleDetails({ vehicle }: { vehicle: VehicleResponse }) {
  const { data, isLoading, error, refetch } = useSessionResults(vehicle.checkInSessionId)
  const imageByAngle = new Map<AngleCode, ImageResult>(data?.images.map((image) => [image.angleCode, image]))
  const vehiclePhotos = VEHICLE_PHOTO_KEYS.map((key) => imageByAngle.get(key)).filter(
    (image): image is ImageResult => Boolean(image),
  )
  const dueState = getDueState(vehicle.expectedReturnAt)

  return (
    <>
      <SheetHeader>
        <SheetTitle>Xe đang cho thuê</SheetTitle>
        <SheetDescription className="sr-only">
          Thông tin khách thuê và ảnh lúc check-in của {vehicle.model}
        </SheetDescription>
      </SheetHeader>

      <SheetBody>
        <div className="flex items-center gap-4">
          <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg border bg-slate-100">
            {vehicle.avatarUrl ? (
              <img src={vehicle.avatarUrl} alt={vehicle.model} className="h-full w-full object-cover" />
            ) : (
              <CarIllustration seed={vehicle.vehicleId} />
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-lg font-semibold leading-tight text-foreground">{vehicle.model}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground">
                {vehicle.licensePlate}
              </span>
              <VehicleStatusBadge status={vehicle.status} />
            </div>
          </div>
        </div>

        <section className="space-y-4 rounded-xl border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <User className="h-4 w-4 text-muted-foreground" />
            Khách thuê
          </h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Họ tên</dt>
              <dd className="font-medium text-foreground">{vehicle.renterName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Số điện thoại</dt>
              <dd className="font-medium text-foreground">
                {vehicle.renterPhone ? (
                  <a href={`tel:${vehicle.renterPhone}`} className="hover:underline">
                    {vehicle.renterPhone}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </dl>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Ảnh CCCD</p>
            <div className="grid grid-cols-2 gap-3">
              {ID_CARD_PHOTO_KEYS.map((key) => (
                <PhotoTile
                  key={key}
                  image={imageByAngle.get(key)}
                  label={ANGLE_LABELS[key]}
                  isLoading={isLoading}
                  aspect="aspect-[1.586]"
                />
              ))}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <TimeBox icon={<CalendarPlus className="h-4 w-4" />} label="Nhận xe" value={formatDateTime(vehicle.checkInAt)} />
          <TimeBox
            icon={<CalendarClock className="h-4 w-4" />}
            label={dueState === 'overdue' ? 'Hạn trả · Quá hạn' : 'Hạn trả'}
            value={formatDateTime(vehicle.expectedReturnAt)}
            className={cn(
              dueState === 'overdue' && 'border-red-200 bg-red-50 text-red-700',
              dueState === 'soon' && 'border-amber-200 bg-amber-50 text-amber-800',
            )}
          />
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Ảnh lúc check-in</h3>
            {data && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {vehiclePhotos.length} ảnh
              </span>
            )}
          </div>
          {error ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Không tải được ảnh check-in: {error}
              <Button variant="secondary" size="sm" onClick={refetch}>
                <RotateCw />
                Thử lại
              </Button>
            </div>
          ) : !vehicle.checkInSessionId ? (
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy phiên check-in của lượt thuê này.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {VEHICLE_PHOTO_KEYS.map((key, index) => (
                <PhotoTile
                  key={key}
                  image={imageByAngle.get(key)}
                  label={`${index + 1}. ${ANGLE_LABELS[key]}`}
                  isLoading={isLoading}
                  aspect="aspect-[4/3]"
                />
              ))}
            </div>
          )}
        </section>
      </SheetBody>

      <SheetFooter>
        <SheetClose asChild>
          <Button variant="secondary">Đóng</Button>
        </SheetClose>
        {vehicle.activeBookingId && (
          <Button asChild>
            <Link to={`/staff/check-out?bookingId=${vehicle.activeBookingId}`}>
              <ScanLine />
              Nhận lại xe · Bắt đầu Check-out
            </Link>
          </Button>
        )}
      </SheetFooter>
    </>
  )
}

function TimeBox({ icon, label, value, className }: { icon: ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={cn('space-y-1 rounded-xl border px-4 py-3 text-foreground', className)}>
      <p className="flex items-center gap-1.5 text-xs opacity-80">
        {icon}
        {label}
      </p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  )
}

interface PhotoTileProps {
  image: ImageResult | undefined
  label: string
  isLoading: boolean
  aspect: string
}

/** Thumbnail that opens the original photo in a new tab. */
function PhotoTile({ image, label, isLoading, aspect }: PhotoTileProps) {
  const [failed, setFailed] = useState(false)

  if (isLoading) {
    return <div className={cn('animate-pulse rounded-lg bg-muted', aspect)} aria-label={`Đang tải ${label}`} />
  }
  if (!image?.imageUrl || failed) {
    return (
      <div className={cn('flex items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground', aspect)} title={label}>
        <ImageOff className="h-4 w-4" />
        <span className="sr-only">Không có ảnh {label}</span>
      </div>
    )
  }
  return (
    <a
      href={image.imageUrl}
      target="_blank"
      rel="noreferrer"
      title={`${label} – mở ảnh gốc`}
      className={cn('block overflow-hidden rounded-lg border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', aspect)}
    >
      <img
        src={image.imageUrl}
        alt={label}
        className="h-full w-full object-cover transition-transform hover:scale-105"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </a>
  )
}
