import { Columns2, Maximize2, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { parseBoundingBox } from '@/lib/boundingBox'
import { angleNumber, getAngleTitle, getDamageLabel, toPercent } from '@/lib/damage'
import { formatDayMonthTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AngleCode, ImageResult, SessionResultResponse, UUID } from '@/types'
import { AnnotatedImage, type DamageOverlay } from './AnnotatedImage'
import { CompareSlider } from './CompareSlider'

export type ViewMode = 'sideBySide' | 'slider'

interface DamageViewerProps {
  session: SessionResultResponse
  image: ImageResult
  /** Report number (#i) of each active damage. */
  damageNumbers: ReadonlyMap<UUID, number>
  selectedDamageId: UUID | null
  mode: ViewMode
  onModeChange: (mode: ViewMode) => void
  onSelectAngle: (angle: AngleCode) => void
  onSelectDamage: (detectionId: UUID) => void
}

/** Right column of mockup 11: photo comparison of one angle with the AI damage overlays. */
export function DamageViewer({
  session,
  image,
  damageNumbers,
  selectedDamageId,
  mode,
  onModeChange,
  onSelectAngle,
  onSelectDamage,
}: DamageViewerProps) {
  const [isZoomed, setIsZoomed] = useState(false)

  const activeDamages = image.damages.filter((damage) => !damage.isOverridden)
  const overlays: DamageOverlay[] = activeDamages.flatMap((damage) => {
    const box = parseBoundingBox(damage.boundingBox)
    if (!box) return []
    const number = damageNumbers.get(damage.detectionId)
    return [
      {
        id: damage.detectionId,
        polygon: box.polygon,
        label: `${number !== undefined ? `#${number} ` : ''}${getDamageLabel(damage.damageType)} ${toPercent(damage.confidenceScore)}%`,
        selected: damage.detectionId === selectedDamageId,
      },
    ]
  })
  // Alignment is per angle pair; any detection of this angle (even a rejected one) tells us.
  const isMisaligned = image.damages.some((damage) => parseBoundingBox(damage.boundingBox)?.aligned === false)
  const selectedDamage = activeDamages.find((damage) => damage.detectionId === selectedDamageId)
  const title = getAngleTitle(image.angleCode)

  const stageProps: ViewerStageProps = {
    image,
    overlays,
    mode,
    title,
    checkInBadge: `CHECK-IN · ${formatDayMonthTime(session.checkInAt)}`,
    checkOutBadge: `CHECK-OUT · ${formatDayMonthTime(session.createdAt)}`,
    onSelectDamage,
  }

  const header = (
    <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-5">
      <h2 className="font-semibold text-foreground">{title}</h2>
      {selectedDamage && (
        <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
          #{damageNumbers.get(selectedDamage.detectionId)} {getDamageLabel(selectedDamage.damageType)}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <ModeToggle mode={mode} onChange={onModeChange} />
        {!isZoomed && (
          <Button variant="secondary" size="icon" onClick={() => setIsZoomed(true)} aria-label="Phóng to">
            <Maximize2 />
          </Button>
        )}
      </div>
    </div>
  )

  const warning = isMisaligned && (
    <p className="flex items-center gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-800 sm:px-5">
      <TriangleAlert className="h-4 w-4 shrink-0" />
      Góc chụp lệch nhiều so với lúc check-in – hãy kiểm tra kỹ bằng mắt.
    </p>
  )

  return (
    <Card className="overflow-hidden">
      {header}
      {warning}
      <ViewerStage {...stageProps} className="h-[420px] sm:h-[460px]" />
      <AngleStrip session={session} selectedAngle={image.angleCode} onSelect={onSelectAngle} />

      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-hidden">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">Xem phóng to ảnh check-in và check-out của góc này.</DialogDescription>
          <div className="pr-10">{header}</div>
          {warning}
          <ViewerStage {...stageProps} className="min-h-0 flex-1" />
          <AngleStrip session={session} selectedAngle={image.angleCode} onSelect={onSelectAngle} />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  const options: { value: ViewMode; label: string; icon: typeof Columns2 }[] = [
    { value: 'sideBySide', label: 'Song song', icon: Columns2 },
    { value: 'slider', label: 'Trượt so sánh', icon: SlidersHorizontal },
  ]
  return (
    <div role="radiogroup" aria-label="Chế độ xem" className="inline-flex rounded-lg border bg-secondary p-0.5">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          onClick={() => onChange(value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            mode === value ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  )
}

interface ViewerStageProps {
  image: ImageResult
  overlays: DamageOverlay[]
  mode: ViewMode
  title: string
  checkInBadge: string
  checkOutBadge: string
  onSelectDamage: (detectionId: UUID) => void
  className?: string
}

function ViewerStage({ image, overlays, mode, title, checkInBadge, checkOutBadge, onSelectDamage, className }: ViewerStageProps) {
  if (mode === 'slider') {
    return (
      <div className={cn('bg-slate-100', className)}>
        <CompareSlider
          key={image.imageId}
          checkInUrl={image.checkInImageUrl}
          checkOutUrl={image.imageUrl}
          checkInBadge={checkInBadge}
          checkOutBadge={checkOutBadge}
          overlays={overlays}
          alt={title}
        />
      </div>
    )
  }

  return (
    <div className={cn('grid grid-rows-2 gap-px bg-border sm:grid-cols-2 sm:grid-rows-1', className)}>
      <AnnotatedImage
        key={`in-${image.checkInImageUrl}`}
        src={image.checkInImageUrl}
        alt={`${title} – lúc check-in`}
        badge={checkInBadge}
        className="bg-slate-100"
      />
      <AnnotatedImage
        key={`out-${image.imageUrl}`}
        src={image.imageUrl}
        alt={`${title} – lúc check-out`}
        overlays={overlays}
        onSelectOverlay={onSelectDamage}
        badge={checkOutBadge}
        badgeTone="checkOut"
        className="bg-slate-100"
      />
    </div>
  )
}

interface AngleStripProps {
  session: SessionResultResponse
  selectedAngle: AngleCode
  onSelect: (angle: AngleCode) => void
}

/** 8 thumbnails; a red dot marks angles that still have new damage. */
function AngleStrip({ session, selectedAngle, onSelect }: AngleStripProps) {
  return (
    <ul className="grid grid-cols-4 gap-2 border-t p-3 sm:grid-cols-8" aria-label="Chọn góc ảnh">
      {session.images.map((image) => {
        const number = angleNumber(image.angleCode)
        const hasDamage = image.damages.some((damage) => !damage.isOverridden)
        const isSelected = image.angleCode === selectedAngle
        return (
          <li key={image.imageId}>
            <button
              type="button"
              onClick={() => onSelect(image.angleCode)}
              aria-pressed={isSelected}
              aria-label={`${getAngleTitle(image.angleCode)}${hasDamage ? ' – có hư hại' : ''}`}
              className={cn(
                'relative block w-full overflow-hidden rounded-lg border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected ? 'border-brand-600' : 'border-transparent hover:border-brand-100',
              )}
            >
              <img
                src={image.imageUrl}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full bg-muted object-cover"
              />
              {number !== null && (
                <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1 text-[11px] font-semibold text-foreground">
                  {number}
                </span>
              )}
              {hasDamage && (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" />
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
