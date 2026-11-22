import { AlertCircle, FileX, Loader2, RotateCw, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { parseBoundingBox } from '@/lib/boundingBox'
import { getActiveDamages, getAngleTitle, getDamageLabel, toPercent, type DamageEntry } from '@/lib/damage'
import { formatDateTime } from '@/lib/format'
import type { SessionResultsState } from '@/hooks/useSessionResults'
import { AnnotatedImage, type DamageOverlay } from '../check-out/damage-review/AnnotatedImage'
import { DamagePreviewDialog } from './DamagePreviewDialog'

/** "Trầy xước · Cản trước" (part name is already Vietnamese and may be missing). */
function getDamageTitle({ damage }: DamageEntry): string {
  const type = getDamageLabel(damage.damageType)
  return damage.partName ? `${type} · ${damage.partName}` : type
}

/** Red region of one damage, highlighted, for the thumbnails. */
function toOverlay({ damage }: DamageEntry, selected: boolean): DamageOverlay[] {
  const box = parseBoundingBox(damage.boundingBox)
  if (!box) return []
  return [
    {
      id: damage.detectionId,
      polygon: box.polygon,
      label: `${getDamageLabel(damage.damageType)} ${toPercent(damage.confidenceScore)}%`,
      selected,
    },
  ]
}

interface MaintenanceDamageListProps {
  /** Null when the maintenance has no check-out session (seed data / status set by hand). */
  hasSession: boolean
  results: SessionResultsState
}

/** Left column of mockup 15: damages (not rejected by staff) of the check-out that sent the vehicle to maintenance. */
export function MaintenanceDamageList({ hasSession, results }: MaintenanceDamageListProps) {
  const [preview, setPreview] = useState<DamageEntry | null>(null)
  const session = results.data
  const entries = session ? getActiveDamages(session.images) : []

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <TriangleAlert className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold text-foreground">Hư hại cần sửa</h2>
          {session && (
            <p className="text-sm text-muted-foreground">Từ kết quả check-out {formatDateTime(session.createdAt)}</p>
          )}
        </div>
      </div>

      {!hasSession ? (
        <EmptyState icon={<FileX className="h-6 w-6" />} text="Không có dữ liệu check-out cho lần bảo trì này." />
      ) : results.isLoading ? (
        <EmptyState icon={<Loader2 className="h-6 w-6 animate-spin" />} text="Đang tải danh sách hư hại…" />
      ) : !session ? (
        <EmptyState
          icon={<AlertCircle className="h-6 w-6 text-destructive" />}
          text={results.error ?? 'Không tải được kết quả check-out.'}
          action={
            <Button variant="secondary" size="sm" onClick={results.refetch}>
              <RotateCw />
              Thử lại
            </Button>
          }
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<FileX className="h-6 w-6" />}
          text="Phiên check-out không còn hư hại nào (các lỗi đã được loại là AI nhầm)."
        />
      ) : (
        <ul className="divide-y" aria-label="Danh sách hư hại cần sửa">
          {entries.map((entry) => {
            const title = getDamageTitle(entry)
            return (
              <li key={entry.damage.detectionId} className="flex items-center gap-4 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setPreview(entry)}
                  className="h-28 w-40 shrink-0 overflow-hidden rounded-lg border bg-slate-100 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-32 sm:w-48"
                  aria-label={`Xem lớn ảnh: ${title}`}
                >
                  <AnnotatedImage
                    key={entry.image.imageUrl}
                    src={entry.image.imageUrl}
                    alt={title}
                    overlays={toOverlay(entry, true)}
                  />
                </button>
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground">{getAngleTitle(entry.image.angleCode)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {preview && session && (
        <DamagePreviewDialog
          entry={preview}
          title={getDamageTitle(preview)}
          checkOutAt={session.createdAt}
          onClose={() => setPreview(null)}
        />
      )}
    </Card>
  )
}

function EmptyState({ icon, text, action }: { icon: ReactNode; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">{icon}</span>
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  )
}
