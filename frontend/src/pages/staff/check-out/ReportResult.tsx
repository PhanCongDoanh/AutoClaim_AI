import { ArrowRight, ExternalLink, FileDown, Loader2, RotateCw, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getErrorMessage } from '@/services/apiClient'
import { inspectionService } from '@/services/inspectionService'
import type { SessionResultResponse, UUID } from '@/types'
import type { DashboardLocationState } from '../dashboardState'
import { getReportFileName, useReportDownload } from './useReportDownload'

interface PreviewResult {
  requestKey: string
  url: string | null
  error: string | null
}

/** Loads `GET /report` as a Blob URL for the preview; the URL is revoked when it changes or on unmount. */
function useReportPreview(sessionId: UUID) {
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState<PreviewResult | null>(null)
  const requestKey = `${sessionId}|${reloadCount}`

  useEffect(() => {
    let ignore = false
    let objectUrl: string | null = null
    inspectionService
      .downloadReport(sessionId)
      .then((blob) => {
        if (ignore) return
        objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
        setResult({ requestKey, url: objectUrl, error: null })
      })
      .catch((err: unknown) => {
        if (!ignore) setResult({ requestKey, url: null, error: getErrorMessage(err) })
      })
    return () => {
      ignore = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [sessionId, requestKey])

  const current = result?.requestKey === requestKey ? result : null
  return {
    url: current?.url ?? null,
    error: current?.error ?? null,
    isLoading: !current,
    reload: () => setReloadCount((count) => count + 1),
  }
}

/** Mockup 13: the real PDF report embedded in the page, plus download and "back to the maintenance tab". */
export function ReportResult({ session }: { session: SessionResultResponse }) {
  const navigate = useNavigate()
  const preview = useReportPreview(session.sessionId)
  const { download, isDownloading } = useReportDownload(session)
  const vehicle = session.vehicle

  function goToDashboard() {
    const state: DashboardLocationState = {
      checkedOut: {
        model: vehicle.model,
        licensePlate: vehicle.licensePlate,
        vehicleStatus: vehicle.status,
        sessionId: session.sessionId,
        reportFileName: getReportFileName(session),
      },
    }
    navigate('/staff', { replace: true, state })
  }

  return (
    <>
      <Card className="bg-slate-100 p-3 sm:p-6">
        {preview.url ? (
          <div className="space-y-2">
            <iframe
              src={preview.url}
              title={`Biên bản ${vehicle.model} · ${vehicle.licensePlate}`}
              className="h-[75vh] min-h-[480px] w-full rounded-lg border bg-white shadow-sm"
            />
            <p className="text-center text-xs text-muted-foreground">
              Không thấy bản xem trước?{' '}
              <a href={preview.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                Mở PDF trong tab mới
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        ) : preview.error ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
            <TriangleAlert className="h-8 w-8 text-destructive" />
            <p className="max-w-md text-sm text-muted-foreground">Không tải được bản xem trước: {preview.error}</p>
            <Button variant="secondary" onClick={preview.reload}>
              <RotateCw />
              Thử lại
            </Button>
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tạo biên bản PDF…
          </div>
        )}
      </Card>

      <StickyActionBar info="Biên bản được tạo từ kết quả check-out, có thể tải lại bất cứ lúc nào.">
        <Button variant="secondary" onClick={download} disabled={isDownloading}>
          {isDownloading ? <Loader2 className="animate-spin" /> : <FileDown />}
          Tải PDF
        </Button>
        <Button onClick={goToDashboard}>
          {vehicle.status === 'MAINTENANCE' ? 'Về tab Bảo trì' : 'Về danh sách xe'}
          <ArrowRight />
        </Button>
      </StickyActionBar>
    </>
  )
}
