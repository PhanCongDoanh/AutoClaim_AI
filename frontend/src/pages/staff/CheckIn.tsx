import { ArrowLeft, ArrowRight, Check, CircleCheck, Loader2, Lock, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import {
  CHECK_IN_PHOTO_KEYS,
  ID_CARD_PHOTO_KEYS,
  VEHICLE_PHOTO_KEYS,
} from '@/components/inspection/photoAngles'
import { SelectVehiclePrompt } from '@/components/inspection/SelectVehiclePrompt'
import { VehicleAnglesStep } from '@/components/inspection/VehicleAnglesStep'
import { VehicleSummaryCard } from '@/components/inspection/VehicleSummaryCard'
import { Button } from '@/components/ui/button'
import { usePhotoCapture } from '@/hooks/usePhotoCapture'
import { useVehicles } from '@/hooks/useVehicles'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/services/apiClient'
import { inspectionService } from '@/services/inspectionService'
import { IdCardPhotosCard } from './check-in/IdCardPhotosCard'
import { RenterInfoCard } from './check-in/RenterInfoCard'
import {
  INITIAL_RENTER_VALUES,
  toCheckInRequest,
  validateRenter,
  type RenterFormErrors,
  type RenterFormValues,
} from './check-in/renterForm'
import type { DashboardLocationState } from './dashboardState'

const CHECK_IN_STEPS = ['Thông tin khách & CCCD', 'Chụp 8 góc xe'] as const

const STEP_DESCRIPTIONS = {
  1: 'Bước 1/2 — Nhập thông tin người thuê và chụp CCCD 2 mặt.',
  2: 'Bước 2/2 — Chụp 8 góc xe làm ảnh gốc. Sau khi xác nhận, xe chuyển sang tab Đang thuê.',
} as const

export default function CheckIn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const vehicleId = searchParams.get('vehicleId')
  const { vehicles, isLoading: isVehicleLoading } = useVehicles('AVAILABLE')
  const vehicle = vehicles.find((item) => item.vehicleId === vehicleId)

  const [step, setStep] = useState<1 | 2>(1)
  const [values, setValues] = useState<RenterFormValues>(INITIAL_RENTER_VALUES)
  const [errors, setErrors] = useState<RenterFormErrors>({})
  const [showMissingIdCard, setShowMissingIdCard] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { getSlot, capture, countReady, getOrderedFiles } = usePhotoCapture()
  const idCardReady = countReady(ID_CARD_PHOTO_KEYS)
  const vehicleReady = countReady(VEHICLE_PHOTO_KEYS)
  const allPhotos = getOrderedFiles(CHECK_IN_PHOTO_KEYS)

  function updateField<K extends keyof RenterFormValues>(field: K, value: RenterFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function goToStep(next: 1 | 2) {
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleContinue() {
    const nextErrors = validateRenter(values)
    const idCardComplete = idCardReady === ID_CARD_PHOTO_KEYS.length
    setErrors(nextErrors)
    setShowMissingIdCard(!idCardComplete)
    if (Object.keys(nextErrors).length === 0 && idCardComplete) goToStep(2)
  }

  async function handleSubmit() {
    if (!vehicle || !allPhotos || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      // Sends `data` as an application/json Blob plus the 10 images in CHECK_IN_PHOTO_KEYS order.
      await inspectionService.checkIn(toCheckInRequest(vehicle.vehicleId, values), allPhotos)
      const state: DashboardLocationState = {
        checkedIn: { model: vehicle.model, licensePlate: vehicle.licensePlate },
      }
      navigate('/staff', { replace: true, state })
    } catch (err) {
      setSubmitError(getErrorMessage(err))
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6 pb-28">
      <div>
        <Button asChild variant="link" size="sm" className="h-auto px-0 text-muted-foreground">
          <Link to="/staff">
            <ArrowLeft />
            Quay lại danh sách xe
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Check-in · Tạo phiên thuê xe</h1>
        <p className="text-sm text-muted-foreground">{STEP_DESCRIPTIONS[step]}</p>
      </div>

      {!vehicleId || isVehicleLoading || !vehicle ? (
        <SelectVehiclePrompt
          isLoading={Boolean(vehicleId) && isVehicleLoading}
          reason={vehicleId ? 'Xe này không còn sẵn sàng cho thuê.' : 'Chưa chọn xe để check-in.'}
        />
      ) : (
        <>
          <VehicleSummaryCard vehicle={vehicle} steps={CHECK_IN_STEPS} step={step} stepsLabel="Các bước check-in" />

          {step === 1 ? (
            <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
              <RenterInfoCard values={values} errors={errors} onChange={updateField} />
              <IdCardPhotosCard
                getSlot={getSlot}
                onCapture={capture}
                readyCount={idCardReady}
                showMissing={showMissingIdCard}
              />
            </div>
          ) : (
            <VehicleAnglesStep
              title="Ảnh ngoại thất"
              getSlot={getSlot}
              onCapture={capture}
              readyCount={vehicleReady}
              disabled={isSubmitting}
              note={
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <p>
                    Khi bấm <strong>Xác nhận cho thuê</strong>, 8 ảnh được lưu làm ảnh gốc của phiên thuê và
                    xe tự động chuyển sang <strong>Đang thuê</strong>.
                  </p>
                </div>
              }
            />
          )}

          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Check-in thất bại: {submitError}</p>
            </div>
          )}

          {step === 1 ? (
            <StickyActionBar
              info={
                <span className="inline-flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Ảnh CCCD chỉ dùng để lưu hồ sơ phiên thuê.
                </span>
              }
            >
              <Button asChild variant="ghost">
                <Link to="/staff">Hủy</Link>
              </Button>
              <Button onClick={handleContinue}>
                Tiếp tục: Chụp 8 góc xe
                <ArrowRight />
              </Button>
            </StickyActionBar>
          ) : (
            <StickyActionBar
              info={
                <>
                  <ProgressTag done={idCardReady} total={ID_CARD_PHOTO_KEYS.length} label="ảnh CCCD" />
                  <ProgressTag done={vehicleReady} total={VEHICLE_PHOTO_KEYS.length} label="góc xe đạt" />
                </>
              }
            >
              <Button variant="secondary" onClick={() => goToStep(1)} disabled={isSubmitting}>
                <ArrowLeft />
                Quay lại
              </Button>
              <Button onClick={handleSubmit} disabled={!allPhotos || isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Check />}
                {isSubmitting ? 'Đang tải ảnh lên…' : 'Xác nhận cho thuê'}
              </Button>
            </StickyActionBar>
          )}
        </>
      )}
    </section>
  )
}

function ProgressTag({ done, total, label }: { done: number; total: number; label: string }) {
  const isComplete = done === total
  return (
    <span className={cn('inline-flex items-center gap-1.5', isComplete && 'text-emerald-700')}>
      <CircleCheck className="h-4 w-4" />
      {done}/{total} {label}
    </span>
  )
}
