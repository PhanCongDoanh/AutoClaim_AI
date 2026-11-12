import { CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { AngleDiagram } from '@/components/inspection/AngleDiagram'
import { PhotoCaptureBox } from '@/components/inspection/PhotoCaptureBox'
import { ANGLE_LABELS, VEHICLE_PHOTO_KEYS } from '@/components/inspection/photoAngles'
import { Card } from '@/components/ui/card'
import { isSlotReady, type PhotoSlot } from '@/hooks/usePhotoCapture'
import type { AngleCode } from '@/types'

interface VehicleAnglesStepProps {
  getSlot: (key: AngleCode) => PhotoSlot
  onCapture: (key: AngleCode, file: File) => void
  readyCount: number
  disabled: boolean
  /** Heading next to the progress bar, e.g. "Ảnh ngoại thất" / "Ảnh trả xe". */
  title: string
  /** Shown below the photo grid (e.g. what happens on submit). */
  note?: ReactNode
  /** Shown below the angle diagram in the left column. */
  aside?: ReactNode
  /** Check-in photo per angle, shown as a small reference in the corner of each box. */
  referenceUrls?: Partial<Record<AngleCode, string>>
}

/** Angle diagram + 8 capture boxes, shared by check-in and check-out. */
export function VehicleAnglesStep({
  getSlot,
  onCapture,
  readyCount,
  disabled,
  title,
  note,
  aside,
  referenceUrls,
}: VehicleAnglesStepProps) {
  const total = VEHICLE_PHOTO_KEYS.length
  const isComplete = readyCount === total
  const isCaptured = (key: AngleCode) => isSlotReady(getSlot(key))
  const nextKey = VEHICLE_PHOTO_KEYS.find((key) => !isCaptured(key))

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <div className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
        <Card>
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Sơ đồ góc chụp</h2>
            <p className="text-xs text-muted-foreground">Đi vòng quanh xe theo chiều kim đồng hồ</p>
          </div>
          <div className="p-5">
            <AngleDiagram isCaptured={isCaptured} currentKey={nextKey} />
          </div>
        </Card>
        {aside}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <div
              className="h-1.5 w-32 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={readyCount}
              aria-label="Tiến độ chụp góc xe"
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${(readyCount / total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {readyCount}/{total} góc đạt
            </span>
          </div>
          {isComplete && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CircleCheck className="h-3.5 w-3.5" />
              Sẵn sàng xác nhận
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {VEHICLE_PHOTO_KEYS.map((key, index) => (
            <PhotoCaptureBox
              key={key}
              variant="angle"
              index={index + 1}
              label={ANGLE_LABELS[key]}
              slot={getSlot(key)}
              onSelect={(file) => onCapture(key, file)}
              disabled={disabled}
              referenceUrl={referenceUrls?.[key]}
            />
          ))}
        </div>

        {note}
      </div>
    </div>
  )
}
