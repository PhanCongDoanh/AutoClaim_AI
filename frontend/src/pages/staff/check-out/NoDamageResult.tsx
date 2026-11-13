import { ArrowLeft, Check, CircleCheck, FileDown, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { ANGLE_LABELS } from '@/components/inspection/photoAngles'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getOverriddenDamages } from '@/lib/damage'
import { getErrorMessage } from '@/services/apiClient'
import { inspectionService } from '@/services/inspectionService'
import type { SessionResultResponse } from '@/types'
import type { DashboardLocationState } from '../dashboardState'
import { ConfirmActionDialog } from './ConfirmActionDialog'
import { useReportDownload } from './useReportDownload'

interface NoDamageResultProps {
  session: SessionResultResponse
  /** Reloads the session (e.g. after a 409 because it was completed elsewhere). */
  onRefresh: () => void
}

/** Mockup 09: no new damage — download the report and complete the return (vehicle → AVAILABLE). */
export function NoDamageResult({ session, onRefresh }: NoDamageResultProps) {
  const navigate = useNavigate()
  const { download, isDownloading } = useReportDownload(session)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const isCompleted = session.bookingStatus === 'COMPLETED'
  const vehicle = session.vehicle
  const overriddenCount = getOverriddenDamages(session.images).length

  async function handleComplete() {
    setIsCompleting(true)
    try {
      const response = await inspectionService.completeInspection(session.sessionId)
      const state: DashboardLocationState = {
        checkedOut: {
          model: vehicle.model,
          licensePlate: vehicle.licensePlate,
          vehicleStatus: response.vehicleStatus,
          sessionId: session.sessionId,
        },
      }
      navigate('/staff', { replace: true, state })
    } catch (err) {
      toast.error('Chưa hoàn tất được trả xe', { description: getErrorMessage(err) })
      setIsCompleting(false)
      setIsConfirmOpen(false)
      onRefresh()
    }
  }

  return (
    <>
      <Card className="mx-auto max-w-3xl overflow-hidden">
        <div className="space-y-3 bg-gradient-to-b from-emerald-50 to-card px-6 py-10 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <ShieldCheck className="h-8 w-8" />
          </span>
          <h2 className="text-xl font-semibold text-foreground">Xe an toàn — không có hư hại mới</h2>
          <p className="mx-auto max-w-lg text-sm text-muted-foreground">
            {isCompleted ? (
              'Phiên trả xe này đã hoàn tất. Bạn vẫn có thể tải lại biên bản PDF.'
            ) : (
              <>
                Tình trạng ngoại thất khớp với lúc check-in. Bấm <strong>Hoàn tất trả xe</strong> để đưa xe về
                trạng thái Sẵn sàng.
              </>
            )}
          </p>
          {overriddenCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Đã loại {overriddenCount} lỗi do AI nhận nhầm (không ghi vào biên bản).
            </p>
          )}
        </div>

        <ul className="grid grid-cols-4 gap-3 border-t p-5 sm:grid-cols-8" aria-label="Ảnh trả xe theo 8 góc">
          {session.images.map((image, index) => (
            <li key={image.imageId} className="relative" title={`${index + 1}. ${ANGLE_LABELS[image.angleCode]}`}>
              <img
                src={image.imageUrl}
                alt={ANGLE_LABELS[image.angleCode]}
                className="aspect-[4/3] w-full rounded-lg border bg-muted object-cover"
                loading="lazy"
              />
              <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <StickyActionBar
        info={
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <CircleCheck className="h-4 w-4" />
            {isCompleted ? (
              'Phiên đã hoàn tất'
            ) : (
              <>
                Không hư hại · Xe sẽ chuyển về tab <strong>Sẵn sàng</strong>
              </>
            )}
          </span>
        }
      >
        <Button variant="secondary" onClick={download} disabled={isDownloading}>
          {isDownloading ? <Loader2 className="animate-spin" /> : <FileDown />}
          Tải biên bản PDF
        </Button>
        {isCompleted ? (
          <Button asChild>
            <Link to="/staff">
              <ArrowLeft />
              Về danh sách xe
            </Link>
          </Button>
        ) : (
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setIsConfirmOpen(true)}>
            <Check />
            Hoàn tất trả xe
          </Button>
        )}
      </StickyActionBar>

      <ConfirmActionDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        icon={<ShieldCheck />}
        title="Hoàn tất trả xe?"
        description={
          <>
            <strong className="text-foreground">
              {vehicle.model} · {vehicle.licensePlate}
            </strong>{' '}
            sẽ chuyển về tab <strong className="text-foreground">Sẵn sàng</strong> và lượt thuê được đóng lại. Thao tác
            này không hoàn tác được.
          </>
        }
        cancelLabel="Chưa, quay lại"
        confirmLabel="Hoàn tất trả xe"
        isPending={isCompleting}
        onConfirm={handleComplete}
      />
    </>
  )
}
