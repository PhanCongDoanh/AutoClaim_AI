import { Columns2 } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { parseBoundingBox } from '@/lib/boundingBox'
import { angleNumber, getDamageLabel, toPercent } from '@/lib/damage'
import { ANGLE_LABELS } from '@/components/inspection/photoAngles'
import { cn } from '@/lib/utils'
import type { AngleCode, ImageResult, SessionResultResponse } from '@/types'
import { AnnotatedImage, type DamageOverlay } from '../check-out/damage-review/AnnotatedImage'
import { AnglePairDialog } from './AnglePairDialog'

function getOverlays(image: ImageResult): DamageOverlay[] {
  return image.damages
    .filter((damage) => !damage.isOverridden)
    .flatMap((damage) => {
      const box = parseBoundingBox(damage.boundingBox)
      if (!box) return []
      return [
        {
          id: damage.detectionId,
          polygon: box.polygon,
          label: `${getDamageLabel(damage.damageType)} ${toPercent(damage.confidenceScore)}%`,
          selected: false,
        },
      ]
    })
}

/** "Ảnh đối chiếu 8 góc": BEFORE (check-in) / AFTER (check-out, red regions for damages not overridden). */
export function AnglePairGrid({ session }: { session: SessionResultResponse }) {
  const [openAngle, setOpenAngle] = useState<AngleCode | null>(null)
  const angleImages = session.images.filter((image) => angleNumber(image.angleCode) !== null)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Columns2 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold text-foreground">Ảnh đối chiếu 8 góc</h2>
          <p className="text-sm text-muted-foreground">
            Bên trái: lúc nhận xe (check-in) · Bên phải: lúc trả xe (check-out)
          </p>
        </div>
      </div>

      {angleImages.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-muted-foreground">Phiên check-out này không có ảnh.</p>
      ) : (
        <ul className="grid gap-x-5 gap-y-6 p-5 sm:grid-cols-2">
          {angleImages.map((image) => {
            const overlays = getOverlays(image)
            const hasDamage = image.damages.some((damage) => !damage.isOverridden)
            const title = ANGLE_LABELS[image.angleCode]
            return (
              <li key={image.imageId} className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-xs text-white">
                    {angleNumber(image.angleCode)}
                  </span>
                  {title}
                  {hasDamage && (
                    <span className="h-2 w-2 rounded-full bg-red-600" role="img" aria-label="có hư hại mới" />
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setOpenAngle(image.angleCode)}
                  aria-label={`Xem lớn cặp ảnh ${title}`}
                  className={cn(
                    'grid w-full grid-cols-2 gap-1.5 rounded-xl border p-1.5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    hasDamage ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white',
                  )}
                >
                  <PairImage label="TRƯỚC" tone="before" src={image.checkInImageUrl} alt={`${title} – lúc nhận xe`} />
                  <PairImage
                    label="SAU"
                    tone="after"
                    src={image.imageUrl}
                    alt={`${title} – lúc trả xe`}
                    overlays={overlays}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {openAngle && (
        <AnglePairDialog session={session} initialAngle={openAngle} onClose={() => setOpenAngle(null)} />
      )}
    </Card>
  )
}

interface PairImageProps {
  label: string
  tone: 'before' | 'after'
  src: string | null
  alt: string
  overlays?: DamageOverlay[]
}

function PairImage({ label, tone, src, alt, overlays }: PairImageProps) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
      <AnnotatedImage key={src ?? 'none'} src={src} alt={alt} overlays={overlays} />
      <span
        className={cn(
          'pointer-events-none absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-white',
          tone === 'before' ? 'bg-slate-700/90' : 'bg-brand-600',
        )}
      >
        {label}
      </span>
    </div>
  )
}
