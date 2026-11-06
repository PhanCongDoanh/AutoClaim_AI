import { CircleCheck, Lock } from 'lucide-react'
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
}

export function VehicleAnglesStep({ getSlot, onCapture, readyCount, disabled }: VehicleAnglesStepProps) {
  const total = VEHICLE_PHOTO_KEYS.length
  const isComplete = readyCount === total
  const isCaptured = (key: AngleCode) => isSlotReady(getSlot(key))
  const nextKey = VEHICLE_PHOTO_KEYS.find((key) => !isCaptured(key))

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <Card className="h-fit lg:sticky lg:top-20">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Sơ đồ góc chụp</h2>
          <p className="text-xs text-muted-foreground">Đi vòng quanh xe theo chiều kim đồng hồ</p>
        </div>
        <div className="p-5">
          <AngleDiagram isCaptured={isCaptured} currentKey={nextKey} />
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">Ảnh ngoại thất</h2>
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
            />
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p>
            Khi bấm <strong>Xác nhận cho thuê</strong>, 8 ảnh được lưu làm ảnh gốc của phiên thuê và
            xe tự động chuyển sang <strong>Đang thuê</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
