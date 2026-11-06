import { Check, ScanFace } from 'lucide-react'
import { PhotoCaptureBox } from '@/components/inspection/PhotoCaptureBox'
import { ANGLE_LABELS, ID_CARD_PHOTO_KEYS } from '@/components/inspection/photoAngles'
import { Card } from '@/components/ui/card'
import type { PhotoSlot } from '@/hooks/usePhotoCapture'
import { cn } from '@/lib/utils'
import type { AngleCode } from '@/types'
import { SectionCardHeader } from './SectionCardHeader'

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
    <Card className={cn(showMissing && !isComplete && 'border-destructive/60')}>
      <SectionCardHeader
        icon={<ScanFace />}
        title="Ảnh CCCD người thuê"
        description="Chụp rõ nét, đủ sáng, không bị lóa."
        action={
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
              isComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-secondary text-muted-foreground',
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
        <p className="px-5 pb-4 text-xs text-destructive">Vui lòng chụp đủ 2 mặt CCCD để tiếp tục.</p>
      )}
    </Card>
  )
}

function IdCardPlaceholder({ side }: { side: 'front' | 'back' }) {
  return (
    <span className="flex aspect-[1.586] w-28 gap-2 rounded-md border border-dashed border-slate-300 bg-card p-2" aria-hidden="true">
      {side === 'front' ? (
        <>
          <span className="w-1/3 rounded bg-slate-200" />
          <span className="flex flex-1 flex-col justify-center gap-1.5">
            <span className="h-1.5 w-full rounded bg-slate-200" />
            <span className="h-1.5 w-3/4 rounded bg-slate-200" />
            <span className="h-1.5 w-1/2 rounded bg-slate-200" />
          </span>
        </>
      ) : (
        <span className="flex flex-1 flex-col justify-between">
          <span className="h-1.5 w-2/3 self-end rounded bg-slate-200" />
          <span className="h-3 w-full rounded bg-slate-200" />
        </span>
      )}
    </span>
  )
}
