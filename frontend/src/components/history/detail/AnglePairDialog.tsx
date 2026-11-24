import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { getActiveDamages } from '@/lib/damage'
import type { AngleCode, SessionResultResponse, UUID } from '@/types'
import { DamageViewer, type ViewMode } from '@/pages/staff/check-out/damage-review/DamageViewer'

interface AnglePairDialogProps {
  session: SessionResultResponse
  initialAngle: AngleCode
  onClose: () => void
}

/**
 * Read-only enlarged before/after comparison: the round-3 viewer (side by side by default, optional slider,
 * angle strip) without any override action.
 */
export function AnglePairDialog({ session, initialAngle, onClose }: AnglePairDialogProps) {
  const [angle, setAngle] = useState<AngleCode>(initialAngle)
  const [mode, setMode] = useState<ViewMode>('sideBySide')
  const [selectedDamageId, setSelectedDamageId] = useState<UUID | null>(null)

  const damageNumbers = useMemo(
    () => new Map(getActiveDamages(session.images).map((entry, index) => [entry.damage.detectionId, index + 1])),
    [session.images],
  )
  const image = session.images.find((item) => item.angleCode === angle) ?? session.images[0]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto p-0 lg:max-w-5xl">
        <DialogTitle className="sr-only">Đối chiếu ảnh trước và sau</DialogTitle>
        <DialogDescription className="sr-only">
          Ảnh lúc nhận xe và lúc trả xe của từng góc, kèm vùng hư hại AI phát hiện. Chỉ xem.
        </DialogDescription>
        {image && (
          <div className="pt-10">
            <DamageViewer
              session={session}
              image={image}
              damageNumbers={damageNumbers}
              selectedDamageId={selectedDamageId}
              mode={mode}
              onModeChange={setMode}
              onSelectAngle={(next) => {
                setAngle(next)
                setSelectedDamageId(null)
              }}
              onSelectDamage={setSelectedDamageId}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
