import { CircleCheck, Images, Loader2, Sparkles, TriangleAlert, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { SelectVehiclePrompt } from '@/components/inspection/SelectVehiclePrompt'
import { VEHICLE_PHOTO_KEYS } from '@/components/inspection/photoAngles'
import { VehicleAnglesStep } from '@/components/inspection/VehicleAnglesStep'
import { VehicleSummaryCard } from '@/components/inspection/VehicleSummaryCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { usePhotoCapture } from '@/hooks/usePhotoCapture'
import { useSessionResults } from '@/hooks/useSessionResults'
import { useVehicles } from '@/hooks/useVehicles'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getConflictSessionId, getErrorMessage } from '@/services/apiClient'
import { inspectionService } from '@/services/inspectionService'
import type { AngleCode, UUID } from '@/types'
import { CheckOutPageHeader } from './checkOutLayout'
import { CHECK_OUT_STEPS } from './checkOutSteps'
import { ConfirmActionDialog } from './ConfirmActionDialog'

const PAGE_TITLE = 'Check-out · Nhận lại xe'
const PAGE_DESCRIPTION = 'Chụp lại 8 góc đúng vị trí lúc check-in. Ảnh nhỏ ở góc là ảnh gốc để đối chiếu.'

/** Mockup 07: capture the 8 return photos of a rented vehicle, then send them to the AI. */
export function CheckOutCaptureStep({ bookingId }: { bookingId: UUID }) {
  const navigate = useNavigate()
  const { vehicles, isLoading: isVehicleLoading, error: vehicleError } = useVehicles('RENTED')
  const vehicle = vehicles.find((item) => item.activeBookingId === bookingId)
  const checkIn = useSessionResults(vehicle?.checkInSessionId ?? null)

  const { getSlot, capture, countReady, getOrderedFiles } = usePhotoCapture()
  const readyCount = countReady(VEHICLE_PHOTO_KEYS)
  const files = getOrderedFiles(VEHICLE_PHOTO_KEYS)
  const hasUnsentPhotos = VEHICLE_PHOTO_KEYS.some((key) => {
    const slot = getSlot(key)
    return Boolean(slot.photo) || slot.isCompressing
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)

  // Browser warning on F5 / closing the tab while photos are captured but not sent yet.
  const warnBeforeUnload = hasUnsentPhotos && !isSent
  useEffect(() => {
    if (!warnBeforeUnload) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Legacy browsers need returnValue set to show the prompt.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [warnBeforeUnload])

  const referenceUrls = useMemo(() => {
    const urls: Partial<Record<AngleCode, string>> = {}
    for (const image of checkIn.data?.images ?? []) {
      if (image.imageUrl) urls[image.angleCode] = image.imageUrl
    }
    return urls
  }, [checkIn.data])
  const checkInPhotoCount = VEHICLE_PHOTO_KEYS.filter((key) => referenceUrls[key]).length

  function requestLeave() {
    if (hasUnsentPhotos && !isSubmitting) {
      setIsCancelDialogOpen(true)
    } else {
      navigate('/staff')
    }
  }

  async function handleSubmit() {
    if (!vehicle || !files || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      // Sends `data` = {bookingId} plus the 8 images in ANGLE_1..8 order (the backend assigns angles by position).
      const response = await inspectionService.checkOut({ bookingId }, files)
      setIsSent(true)
      navigate(`/staff/check-out?sessionId=${response.sessionId}`, { replace: true })
    } catch (err) {
      const existingSessionId = getConflictSessionId(err)
      if (existingSessionId) {
        // F9: this booking was already checked out — continue with that session.
        setIsSent(true)
        toast.info('Xe này đã được gửi check-out trước đó', {
          description: 'Đang mở phiên check-out hiện có.',
        })
        navigate(`/staff/check-out?sessionId=${existingSessionId}`, { replace: true })
        return
      }
      const message = getErrorMessage(err)
      setSubmitError(message)
      toast.error('Gửi ảnh trả xe thất bại', { description: message })
      setIsSubmitting(false)
    }
  }

  if (isVehicleLoading || vehicleError || !vehicle) {
    return (
      <section className="mx-auto max-w-6xl space-y-6">
        <CheckOutPageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <SelectVehiclePrompt
          isLoading={isVehicleLoading}
          reason={
            vehicleError
              ? `Không tải được danh sách xe: ${vehicleError}`
              : 'Không tìm thấy xe đang thuê ứng với lượt thuê này (có thể xe đã được trả).'
          }
        />
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6 pb-28">
      <CheckOutPageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} onBack={requestLeave} />

      <VehicleSummaryCard
        vehicle={vehicle}
        renterName={vehicle.renterName}
        steps={CHECK_OUT_STEPS}
        step={1}
        stepsLabel="Các bước check-out"
      />

      <VehicleAnglesStep
        title="Ảnh trả xe"
        getSlot={getSlot}
        onCapture={capture}
        readyCount={readyCount}
        disabled={isSubmitting}
        referenceUrls={referenceUrls}
        aside={
          <Card className="space-y-2 p-5">
            <h2 className="text-sm font-semibold text-foreground">Ảnh gốc lúc check-in</h2>
            <p className="text-sm text-muted-foreground">{formatDateTime(vehicle.checkInAt)}</p>
            {checkIn.isLoading ? (
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang tải ảnh gốc…
              </p>
            ) : checkIn.error ? (
              <p className="text-xs text-destructive">Không tải được ảnh gốc: {checkIn.error}</p>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                <Images className="h-3.5 w-3.5" />
                {checkInPhotoCount} ảnh
              </span>
            )}
          </Card>
        }
      />

      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Gửi ảnh thất bại: {submitError}</p>
        </div>
      )}

      <StickyActionBar
        info={
          <span
            className={cn(
              'inline-flex items-center gap-1.5',
              readyCount === VEHICLE_PHOTO_KEYS.length && 'text-emerald-700',
            )}
          >
            <CircleCheck className="h-4 w-4" />
            {readyCount}/{VEHICLE_PHOTO_KEYS.length} góc đã chụp
          </span>
        }
      >
        <Button variant="ghost" onClick={requestLeave} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button onClick={handleSubmit} disabled={!files || isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {isSubmitting ? 'Đang tải ảnh lên…' : 'Gửi AI kiểm tra hư hại'}
        </Button>
      </StickyActionBar>

      <ConfirmActionDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        tone="destructive"
        icon={<Trash2 />}
        title="Huỷ check-out?"
        description={`Bạn đã chụp ${readyCount}/${VEHICLE_PHOTO_KEYS.length} góc nhưng chưa gửi. Các ảnh này sẽ bị bỏ.`}
        cancelLabel="Tiếp tục chụp"
        confirmLabel="Bỏ ảnh và quay lại"
        onConfirm={() => {
          setIsCancelDialogOpen(false)
          navigate('/staff')
        }}
      />
    </section>
  )
}
