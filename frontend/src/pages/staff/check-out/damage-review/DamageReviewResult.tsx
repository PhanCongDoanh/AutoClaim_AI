import { ChevronRight, FileDown, ListX, Trash2, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getActiveDamages,
  getAngleTitle,
  getDamageLabel,
  getOverriddenDamages,
  toPercent,
  type DamageEntry,
} from '@/lib/damage'
import { cn } from '@/lib/utils'
import { getErrorMessage, isConflictError } from '@/services/apiClient'
import { inspectionService } from '@/services/inspectionService'
import type { AngleCode, SessionResultResponse, UUID } from '@/types'
import { ConfirmActionDialog } from '../ConfirmActionDialog'
import { DamageViewer, type ViewMode } from './DamageViewer'
import { OverrideDamageDialog } from './OverrideDamageDialog'

interface DamageReviewResultProps {
  session: SessionResultResponse
  /** Updates the loaded session in place (override / completion) without reloading the page. */
  onSessionChange: (updater: (session: SessionResultResponse) => SessionResultResponse) => void
  /** Reloads the session from the API (e.g. after a 409). */
  onRefresh: () => void
}

function markOverridden(session: SessionResultResponse, detectionId: UUID, reason: string): SessionResultResponse {
  return {
    ...session,
    images: session.images.map((image) => ({
      ...image,
      damages: image.damages.map((damage) =>
        damage.detectionId === detectionId ? { ...damage, isOverridden: true, overrideReason: reason } : damage,
      ),
    })),
  }
}

function damageTitle({ damage, image }: DamageEntry, number: number): string {
  return `#${number} ${getDamageLabel(damage.damageType)} · ${damage.partName ?? getAngleTitle(image.angleCode)}`
}

/**
 * Mockup 11: review the new damages found by the AI, remove AI mistakes (mockup 12), then produce the report and
 * move the vehicle to maintenance. When the last damage is removed, the parent switches to mockup 09 by itself.
 */
export function DamageReviewResult({ session, onSessionChange, onRefresh }: DamageReviewResultProps) {
  const activeDamages = getActiveDamages(session.images)
  const overriddenDamages = getOverriddenDamages(session.images)
  const damageNumbers = useMemo(
    () => new Map(getActiveDamages(session.images).map(({ damage }, index) => [damage.detectionId, index + 1])),
    [session.images],
  )

  const [selectedDamageId, setSelectedDamageId] = useState<UUID | null>(activeDamages[0]?.damage.detectionId ?? null)
  const [selectedAngle, setSelectedAngle] = useState<AngleCode>(
    activeDamages[0]?.image.angleCode ?? session.images[0]?.angleCode ?? 'ANGLE_1',
  )
  const [mode, setMode] = useState<ViewMode>('sideBySide')
  const [overrideTarget, setOverrideTarget] = useState<DamageEntry | null>(null)
  const [isOverriding, setIsOverriding] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  const currentImage = session.images.find((image) => image.angleCode === selectedAngle) ?? session.images[0]
  const vehicle = session.vehicle
  const count = activeDamages.length

  function selectDamage(entry: DamageEntry) {
    setSelectedDamageId(entry.damage.detectionId)
    setSelectedAngle(entry.image.angleCode)
  }

  function selectAngle(angle: AngleCode) {
    setSelectedAngle(angle)
    const first = activeDamages.find((entry) => entry.image.angleCode === angle)
    setSelectedDamageId(first?.damage.detectionId ?? null)
  }

  async function handleOverride(reason: string) {
    if (!overrideTarget) return
    const target = overrideTarget
    const detectionId = target.damage.detectionId
    const number = damageNumbers.get(detectionId) ?? 0
    setIsOverriding(true)
    try {
      await inspectionService.overrideDamage(detectionId, { overrideReason: reason })
      onSessionChange((current) => markOverridden(current, detectionId, reason))

      // Keep the selection near the removed card.
      const index = activeDamages.findIndex((entry) => entry.damage.detectionId === detectionId)
      const remaining = activeDamages.filter((entry) => entry.damage.detectionId !== detectionId)
      const next = remaining[Math.min(index, remaining.length - 1)]
      if (next) selectDamage(next)
      else setSelectedDamageId(null)

      toast.success(`Đã loại lỗi #${number} ${getDamageLabel(target.damage.damageType)}`, {
        description: remaining.length === 0 ? 'Không còn hư hại mới – có thể hoàn tất trả xe.' : undefined,
      })
      setOverrideTarget(null)
    } catch (err) {
      toast.error('Chưa xoá được lỗi này', { description: getErrorMessage(err) })
      if (isConflictError(err)) {
        setOverrideTarget(null)
        onRefresh()
      }
    } finally {
      setIsOverriding(false)
    }
  }

  async function handleComplete() {
    setIsCompleting(true)
    try {
      const response = await inspectionService.completeInspection(session.sessionId)
      // Booking closed → the parent shows the report screen (mockup 13).
      onSessionChange((current) => ({
        ...current,
        bookingStatus: response.bookingStatus,
        vehicle: { ...current.vehicle, status: response.vehicleStatus },
      }))
    } catch (err) {
      toast.error('Chưa xuất được biên bản', { description: getErrorMessage(err) })
      setIsCompleting(false)
      setIsConfirmOpen(false)
      onRefresh()
    }
  }

  return (
    <>
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 sm:px-5 sm:py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
          <TriangleAlert className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold">
            Phát hiện {count} hư hại mới so với lúc check-in
          </p>
          <p className="text-sm">Kiểm tra từng lỗi bên dưới. Nếu AI nhận nhầm, bấm “Xoá (AI nhầm)”.</p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="space-y-3">
          <ol className="space-y-3" aria-label="Danh sách hư hại mới">
            {activeDamages.map((entry, index) => (
              <DamageCard
                key={entry.damage.detectionId}
                entry={entry}
                number={index + 1}
                selected={entry.damage.detectionId === selectedDamageId}
                disabled={isCompleting}
                onSelect={() => selectDamage(entry)}
                onOverride={() => setOverrideTarget(entry)}
              />
            ))}
          </ol>
          {overriddenDamages.length > 0 && <OverriddenList entries={overriddenDamages} />}
        </div>

        {currentImage && (
          <DamageViewer
            session={session}
            image={currentImage}
            damageNumbers={damageNumbers}
            selectedDamageId={selectedDamageId}
            mode={mode}
            onModeChange={setMode}
            onSelectAngle={selectAngle}
            onSelectDamage={(detectionId) => {
              const entry = activeDamages.find((item) => item.damage.detectionId === detectionId)
              if (entry) selectDamage(entry)
            }}
          />
        )}
      </div>

      <StickyActionBar
        info={
          <span className="inline-flex items-center gap-1.5 text-red-700">
            <TriangleAlert className="h-4 w-4" />
            {count} hư hại mới · Xe sẽ chuyển sang tab <strong>Bảo trì</strong>
          </span>
        }
      >
        <Button variant="destructive" onClick={() => setIsConfirmOpen(true)} disabled={isCompleting}>
          <FileDown />
          Xuất PDF &amp; Chuyển sang Bảo trì
        </Button>
      </StickyActionBar>

      {overrideTarget && (
        <OverrideDamageDialog
          key={overrideTarget.damage.detectionId}
          open
          onOpenChange={(open) => !open && setOverrideTarget(null)}
          damageTitle={damageTitle(overrideTarget, damageNumbers.get(overrideTarget.damage.detectionId) ?? 0)}
          isPending={isOverriding}
          onConfirm={handleOverride}
        />
      )}

      <ConfirmActionDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        tone="destructive"
        icon={<FileDown />}
        title="Xuất biên bản và chuyển xe sang Bảo trì?"
        description={
          <>
            Biên bản PDF ghi nhận <strong className="text-foreground">{count} hư hại mới</strong> của{' '}
            <strong className="text-foreground">
              {vehicle.model} · {vehicle.licensePlate}
            </strong>
            . Xe chuyển sang tab <strong className="text-foreground">Bảo trì</strong> và lượt thuê được đóng lại. Sau
            bước này không xoá lỗi AI nhầm được nữa.
          </>
        }
        cancelLabel="Chưa, kiểm tra lại"
        confirmLabel="Xuất PDF & Chuyển sang Bảo trì"
        isPending={isCompleting}
        onConfirm={handleComplete}
      />
    </>
  )
}

interface DamageCardProps {
  entry: DamageEntry
  number: number
  selected: boolean
  disabled: boolean
  onSelect: () => void
  onOverride: () => void
}

function DamageCard({ entry, number, selected, disabled, onSelect, onOverride }: DamageCardProps) {
  const { damage, image } = entry
  const percent = toPercent(damage.confidenceScore)
  return (
    <li>
      <Card className={cn('overflow-hidden transition-shadow', selected && 'border-brand-600 ring-1 ring-brand-600')}>
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="block w-full space-y-3 p-4 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-50 text-sm font-semibold text-red-600">
              #{number}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">
                {getDamageLabel(damage.damageType)}
                {damage.partName && ` · ${damage.partName}`}
              </p>
              <p className="text-sm text-muted-foreground">{getAngleTitle(image.angleCode)}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Độ tin cậy của AI</p>
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn('h-full rounded-full', percent >= 80 ? 'bg-brand-600' : 'bg-brand-500/80')}
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
              <span className="w-10 text-right text-sm font-medium tabular-nums text-foreground">{percent}%</span>
            </div>
          </div>
        </button>
        <div className="border-t px-4 py-3">
          <Button
            variant="secondary"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={onOverride}
            disabled={disabled}
          >
            <Trash2 />
            Xoá (AI nhầm)
          </Button>
        </div>
      </Card>
    </li>
  )
}

/** Collapsible "Đã loại (m)": damages removed as AI mistakes, with the staff's reason. */
function OverriddenList({ entries }: { entries: DamageEntry[] }) {
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
        <ListX className="h-4 w-4" />
        Đã loại ({entries.length})
      </summary>
      <ul className="divide-y border-t">
        {entries.map(({ damage, image }) => (
          <li key={damage.detectionId} className="space-y-0.5 px-4 py-3 text-sm">
            <p className="font-medium text-muted-foreground line-through decoration-muted-foreground/50">
              {getDamageLabel(damage.damageType)}
              {damage.partName && ` · ${damage.partName}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {getAngleTitle(image.angleCode)} · {toPercent(damage.confidenceScore)}%
            </p>
            <p className="text-xs text-foreground">Lý do: {damage.overrideReason ?? '—'}</p>
          </li>
        ))}
      </ul>
    </details>
  )
}
