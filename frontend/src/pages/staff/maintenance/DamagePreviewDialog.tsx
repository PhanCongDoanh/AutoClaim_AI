import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { parseBoundingBox } from '@/lib/boundingBox'
import { getAngleTitle, getDamageLabel, toPercent, type DamageEntry } from '@/lib/damage'
import { formatDayMonthTime } from '@/lib/format'
import type { LocalDateTime } from '@/types'
import { AnnotatedImage, type DamageOverlay } from '../check-out/damage-review/AnnotatedImage'

interface DamagePreviewDialogProps {
  entry: DamageEntry
  /** "Trầy xước · Cản trước". */
  title: string
  checkOutAt: LocalDateTime
  onClose: () => void
}

/**
 * Read-only enlarged check-out photo of one angle (no override actions): every active damage of the angle is drawn,
 * the chosen one highlighted.
 */
export function DamagePreviewDialog({ entry, title, checkOutAt, onClose }: DamagePreviewDialogProps) {
  const { image, damage: chosen } = entry
  const overlays: DamageOverlay[] = image.damages
    .filter((damage) => !damage.isOverridden)
    .flatMap((damage) => {
      const box = parseBoundingBox(damage.boundingBox)
      if (!box) return []
      return [
        {
          id: damage.detectionId,
          polygon: box.polygon,
          label: `${getDamageLabel(damage.damageType)} ${toPercent(damage.confidenceScore)}%`,
          selected: damage.detectionId === chosen.detectionId,
        },
      ]
    })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] gap-4 overflow-hidden p-5 lg:max-w-5xl">
        <div className="space-y-1 pr-10">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {getAngleTitle(image.angleCode)} · Ảnh check-out
          </DialogDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-slate-900">
          <AnnotatedImage
            key={image.imageUrl}
            src={image.imageUrl}
            alt={title}
            overlays={overlays}
            badge={`CHECK-OUT · ${formatDayMonthTime(checkOutAt)}`}
            badgeTone="checkOut"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
