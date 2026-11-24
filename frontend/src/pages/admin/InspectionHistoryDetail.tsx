import { HistoryDetailPage } from '@/components/history/HistoryDetailPage'

/** Admin: one returned rental (`/admin/history/:checkOutSessionId`), same read-only page as staff. */
export default function InspectionHistoryDetail() {
  return <HistoryDetailPage basePath="/admin/history" />
}
