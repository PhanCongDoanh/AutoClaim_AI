import { ArrowLeft, Construction, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ANGLE_LABELS, VEHICLE_PHOTO_KEYS } from '@/components/inspection/photoAngles'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getActiveDamages, getDamageLabel } from '@/lib/damage'
import type { AngleCode, SessionResultResponse } from '@/types'

function angleNumber(angle: AngleCode): number | null {
  const index = (VEHICLE_PHOTO_KEYS as readonly AngleCode[]).indexOf(angle)
  return index >= 0 ? index + 1 : null
}

/**
 * Temporary result view when the AI found new damage. The full review screen (mockup 11: viewer,
 * overlays, removing AI mistakes, report) is built in phase 3.
 */
export function DamageResultPlaceholder({ session }: { session: SessionResultResponse }) {
  const damages = getActiveDamages(session.images)

  return (
    <Card className="mx-auto max-w-3xl overflow-hidden">
      <div className="flex items-start gap-3 border-b bg-red-50 px-6 py-4 text-red-800">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Phát hiện {damages.length} hư hại mới so với lúc check-in</p>
          <p className="flex items-center gap-1.5 text-sm">
            <Construction className="h-4 w-4" />
            Màn duyệt hư hại đang phát triển – hiện chỉ hiển thị danh sách.
          </p>
        </div>
      </div>

      <ol className="divide-y">
        {damages.map(({ image, damage }, index) => {
          const number = angleNumber(image.angleCode)
          return (
            <li key={damage.detectionId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-6 py-3 text-sm">
              <span className="font-semibold text-red-700">#{index + 1}</span>
              <span className="font-medium text-foreground">
                {getDamageLabel(damage.damageType)}
                {damage.partName && ` · ${damage.partName}`}
              </span>
              <span className="text-muted-foreground">
                {number !== null ? `Góc ${number} · ` : ''}
                {ANGLE_LABELS[image.angleCode]}
              </span>
              <span className="ml-auto tabular-nums text-muted-foreground">
                Độ tin cậy {Math.round(damage.confidenceScore * 100)}%
              </span>
            </li>
          )
        })}
      </ol>

      <div className="flex justify-end border-t px-6 py-4">
        <Button asChild variant="secondary">
          <Link to="/staff">
            <ArrowLeft />
            Về danh sách xe
          </Link>
        </Button>
      </div>
    </Card>
  )
}
