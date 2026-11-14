import { useState } from 'react'
import { toast } from 'sonner'
import { formatFileDate } from '@/lib/format'
import { saveBlob } from '@/lib/download'
import { getErrorMessage } from '@/services/apiClient'
import { inspectionService } from '@/services/inspectionService'
import type { SessionResultResponse } from '@/types'

/** `Bien-ban_<bien-so>_<dd-MM-yyyy>.pdf`, dated by the check-out session. */
export function getReportFileName(session: SessionResultResponse): string {
  const plate = session.vehicle.licensePlate.replace(/[^\w.-]+/g, '')
  return `Bien-ban_${plate}_${formatFileDate(session.createdAt)}.pdf`
}

/** Downloads the session's PDF report (`GET /report`) as a file, with toast feedback on errors. */
export function useReportDownload(session: SessionResultResponse) {
  const [isDownloading, setIsDownloading] = useState(false)

  async function download() {
    setIsDownloading(true)
    try {
      const blob = await inspectionService.downloadReport(session.sessionId)
      saveBlob(blob, getReportFileName(session))
    } catch (err) {
      toast.error('Không tải được biên bản PDF', { description: getErrorMessage(err) })
    } finally {
      setIsDownloading(false)
    }
  }

  return { download, isDownloading }
}
