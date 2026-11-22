import { ArrowLeft, Download, History as HistoryIcon, Loader2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CarIllustration } from '@/components/vehicle/CarIllustration'
import { useSessionResults } from '@/hooks/useSessionResults'
import { formatDateTime } from '@/lib/format'
import type { SessionResultResponse } from '@/types'
import { useReportDownload } from './check-out/useReportDownload'
import type { HistoryDetailLocationState } from './history/historyQuery'
import { AiResultCard } from './history-detail/AiResultCard'
import { AnglePairGrid } from './history-detail/AnglePairGrid'
import { IdCardPhotosCard } from './history-detail/IdCardPhotosCard'

/** Mockup S3: read-only record of one returned rental (`/staff/history/:checkOutSessionId`). */
export default function HistoryDetail() {
  const { checkOutSessionId } = useParams()
  const location = useLocation()
  const historySearch = (location.state as HistoryDetailLocationState | null)?.historySearch ?? ''
  const backTo = `/staff/history${historySearch}`
  const results = useSessionResults(checkOutSessionId ?? null)
  const session = results.data
  const isReturnedRental = session?.sessionType === 'CHECK_OUT' && session.bookingStatus === 'COMPLETED'

  return (
    <section className="space-y-6">
      <div>
        <Button asChild variant="link" size="sm" className="h-auto px-0 text-muted-foreground">
          <Link to={backTo}>
            <ArrowLeft />
            Quay lại Lịch sử kiểm định
          </Link>
        </Button>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Chi tiết lượt thuê</h1>
            <p className="text-sm text-muted-foreground">
              Ảnh đối chiếu lúc nhận xe và lúc trả xe, kèm kết quả AI đã lưu.
            </p>
          </div>
          {session && isReturnedRental && <DownloadReportButton session={session} />}
        </div>
      </div>

      {results.isLoading ? (
        <Card className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải lượt thuê…
        </Card>
      ) : !session || !isReturnedRental ? (
        <NotFoundNotice
          backTo={backTo}
          message={
            session
              ? 'Đây không phải một lượt trả xe đã hoàn tất, nên không có trong lịch sử kiểm định.'
              : (results.error ?? 'Không tìm thấy lượt thuê này.')
          }
          onRetry={session ? undefined : results.refetch}
        />
      ) : (
        <HistoryRecord session={session} />
      )}
    </section>
  )
}

function DownloadReportButton({ session }: { session: SessionResultResponse }) {
  const { download, isDownloading } = useReportDownload(session)
  return (
    <Button variant="secondary" onClick={() => void download()} disabled={isDownloading}>
      {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
      Tải biên bản PDF
    </Button>
  )
}

function HistoryRecord({ session }: { session: SessionResultResponse }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        <VehicleInfoCard session={session} />
        <Card className="space-y-1 p-5">
          <p className="text-sm text-muted-foreground">Khách thuê</p>
          <p className="text-lg font-semibold text-foreground">{session.renterName ?? '—'}</p>
          {session.renterPhone && <p className="text-muted-foreground">{session.renterPhone}</p>}
        </Card>
        <Card className="p-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <InfoRow label="Nhận xe">{formatDateTime(session.checkInAt)}</InfoRow>
            <InfoRow label="Trả xe">{formatDateTime(session.createdAt)}</InfoRow>
            <InfoRow label="NV giao xe">{session.checkInStaffName ?? '—'}</InfoRow>
            <InfoRow label="NV nhận lại xe">{session.staffName ?? '—'}</InfoRow>
          </dl>
        </Card>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_minmax(320px,400px)]">
        <AnglePairGrid session={session} />
        <div className="space-y-6">
          <AiResultCard session={session} />
          <IdCardPhotosCard checkInSessionId={session.checkInSessionId} />
          {session.handoverNotes && <NoteCard title="Ghi chú bàn giao" text={session.handoverNotes} />}
          {session.maintenanceNotes && <NoteCard title="Ghi chú sửa chữa" text={session.maintenanceNotes} />}
        </div>
      </div>
    </>
  )
}

function VehicleInfoCard({ session }: { session: SessionResultResponse }) {
  const { vehicle } = session
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {vehicle.avatarUrl && vehicle.avatarUrl !== failedUrl ? (
          <img
            src={vehicle.avatarUrl}
            alt={vehicle.model}
            className="h-full w-full object-cover"
            onError={() => setFailedUrl(vehicle.avatarUrl)}
          />
        ) : (
          <CarIllustration seed={vehicle.vehicleId} />
        )}
      </div>
      <div className="min-w-0 space-y-1.5">
        <p className="truncate text-lg font-semibold text-foreground" title={vehicle.model}>
          {vehicle.model}
        </p>
        <span className="inline-block rounded-md border bg-white px-2 py-0.5 text-sm font-semibold text-slate-800">
          {vehicle.licensePlate}
        </span>
      </div>
    </Card>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </>
  )
}

function NoteCard({ title, text }: { title: string; text: string }) {
  return (
    <Card className="space-y-2 p-5">
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="whitespace-pre-line text-sm text-slate-700">{text}</p>
    </Card>
  )
}

interface NotFoundNoticeProps {
  backTo: string
  message: string
  onRetry?: () => void
}

function NotFoundNotice({ backTo, message, onRetry }: NotFoundNoticeProps) {
  return (
    <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <HistoryIcon className="h-6 w-6" />
      </span>
      <p className="flex-1 text-sm text-muted-foreground">{message}</p>
      <div className="flex gap-2">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Thử lại
          </Button>
        )}
        <Button asChild variant="secondary">
          <Link to={backTo}>
            <ArrowLeft />
            Về Lịch sử kiểm định
          </Link>
        </Button>
      </div>
    </Card>
  )
}
