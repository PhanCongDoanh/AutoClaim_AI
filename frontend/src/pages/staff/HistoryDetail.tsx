import { HistoryDetailPage } from '@/components/history/HistoryDetailPage'

/** Staff: one returned rental (`/staff/history/:checkOutSessionId`). */
export default function HistoryDetail() {
  return <HistoryDetailPage basePath="/staff/history" />
}
