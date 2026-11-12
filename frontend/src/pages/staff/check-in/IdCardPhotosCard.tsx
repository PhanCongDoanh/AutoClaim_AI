import { Check, ScanFace } from 'lucide-react'
import { PhotoCaptureBox } from '@/components/inspection/PhotoCaptureBox'
import { ANGLE_LABELS, ID_CARD_PHOTO_KEYS } from '@/components/inspection/photoAngles'
import type { PhotoSlot } from '@/hooks/usePhotoCapture'
import { cn } from '@/lib/utils'
import type { AngleCode } from '@/types'
import { CHECK_IN_CARD_CLASS, SectionCardHeader } from './SectionCardHeader'

interface IdCardPhotosCardProps {
  getSlot: (key: AngleCode) => PhotoSlot
  onCapture: (key: AngleCode, file: File) => void
  readyCount: number
  /** Highlights missing photos after the user tried to continue. */
  showMissing: boolean
}

export function IdCardPhotosCard({ getSlot, onCapture, readyCount, showMissing }: IdCardPhotosCardProps) {
  const total = ID_CARD_PHOTO_KEYS.length
  const isComplete = readyCount === total

  return (
    <div className={cn(CHECK_IN_CARD_CLASS, showMissing && !isComplete && 'border-red-300 ring-1 ring-red-200')}>
      <SectionCardHeader
        icon={<ScanFace />}
        title="Ảnh CCCD người thuê"
        description="Chụp rõ nét, đủ sáng, không bị lóa."
        action={
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold',
              isComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700',
            )}
          >
            {isComplete && <Check className="h-3 w-3" strokeWidth={3} />}
            {readyCount}/{total} ảnh
          </span>
        }
      />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {ID_CARD_PHOTO_KEYS.map((key) => (
          <PhotoCaptureBox
            key={key}
            variant="document"
            label={ANGLE_LABELS[key]}
            slot={getSlot(key)}
            onSelect={(file) => onCapture(key, file)}
            placeholder={<IdCardPlaceholder side={key === 'CCCD_FRONT' ? 'front' : 'back'} />}
          />
        ))}
      </div>
      {showMissing && !isComplete && (
        <p className="px-5 pb-4 text-xs font-medium text-destructive">Vui lòng chụp đủ 2 mặt CCCD để tiếp tục.</p>
      )}
    </div>
  )
}

function IdCardPlaceholder({ side }: { side: 'front' | 'back' }) {
  return (
    <span
      className="flex aspect-[1.586] w-32 gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.18)]"
      aria-hidden="true"
    >
      {side === 'front' ? (
        <>
          <span className="flex w-[38%] items-end justify-center overflow-hidden rounded-md bg-slate-100">
            <span className="flex flex-col items-center">
              <span className="h-3.5 w-3.5 rounded-full bg-slate-300" />
              <span className="mt-0.5 h-3 w-7 rounded-t-full bg-slate-300" />
            </span>
          </span>
          <span className="flex flex-1 flex-col justify-center gap-1.5">
            <span className="h-1.5 w-full rounded-full bg-slate-200" />
            <span className="h-1.5 w-3/4 rounded-full bg-slate-200" />
            <span className="h-1.5 w-1/2 rounded-full bg-slate-200" />
          </span>
        </>
      ) : (
        <span className="flex flex-1 flex-col justify-center gap-2 px-1">
          <span className="h-1.5 w-full rounded-full bg-slate-200" />
          <span className="h-1.5 w-full rounded-full bg-slate-200" />
          <span className="h-1.5 w-2/3 rounded-full bg-slate-200" />
        </span>
      )}
    </span>
  )
}
