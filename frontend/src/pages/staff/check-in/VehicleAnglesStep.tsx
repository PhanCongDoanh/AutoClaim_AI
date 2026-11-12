import { CircleCheck, Lock } from 'lucide-react'
import { AngleDiagram } from '@/components/inspection/AngleDiagram'
import { PhotoCaptureBox } from '@/components/inspection/PhotoCaptureBox'
import { ANGLE_LABELS, VEHICLE_PHOTO_KEYS } from '@/components/inspection/photoAngles'
import { isSlotReady, type PhotoSlot } from '@/hooks/usePhotoCapture'
import { cn } from '@/lib/utils'
import type { AngleCode } from '@/types'
import { CHECK_IN_CARD_CLASS } from './SectionCardHeader'

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
    <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
      <div className={cn(CHECK_IN_CARD_CLASS, 'h-fit lg:sticky lg:top-24')}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-[16px] font-bold text-slate-900">Sơ đồ góc chụp</h2>
          <p className="mt-0.5 text-[13px] leading-snug text-slate-500">Đi vòng quanh xe theo chiều kim đồng hồ</p>
        </div>
        <div className="px-5 pb-5 pt-4">
          <AngleDiagram isCaptured={isCaptured} currentKey={nextKey} />
        </div>
      </div>

      <div className={cn(CHECK_IN_CARD_CLASS, 'space-y-4 p-4 sm:p-5')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-4">
            <h2 className="text-[16px] font-bold text-slate-900">Ảnh ngoại thất</h2>
            <div
              className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100 sm:w-44"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={readyCount}
              aria-label="Tiến độ chụp góc xe"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                style={{ width: `${(readyCount / total) * 100}%` }}
              />
            </div>
            <span className="text-[13px] font-medium text-slate-500">
              {readyCount}/{total} góc đạt
            </span>
          </div>
          {isComplete && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CircleCheck className="h-3.5 w-3.5" />
              Sẵn sàng xác nhận
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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

        <div className="flex items-start gap-3 rounded-xl border border-blue-200/80 bg-[#eef4ff] px-4 py-3 text-[14px] text-slate-700">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p>
            Khi bấm <strong className="text-slate-900">Xác nhận cho thuê</strong>, 8 ảnh được lưu làm ảnh gốc của
            phiên thuê và xe tự động chuyển sang <strong className="text-slate-900">Đang thuê</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
