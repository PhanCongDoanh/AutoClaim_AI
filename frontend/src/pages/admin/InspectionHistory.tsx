import { HistoryListPage } from '@/components/history/HistoryListPage'

/** Admin inspection history (`/admin/history`): staff history + summary cards and monitoring filters. Read-only. */
export default function InspectionHistory() {
  return <HistoryListPage basePath="/admin/history" variant="admin" />
}
