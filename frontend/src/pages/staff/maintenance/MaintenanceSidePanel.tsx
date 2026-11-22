import { Download, FileText, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { MAINTENANCE_NOTES_MAX_LENGTH, type SessionResultResponse } from '@/types'
import { getReportFileName, useReportDownload } from '../check-out/useReportDownload'

/** "Biên bản đính kèm": the PDF report is regenerated from the locked check-out results on download. */
export function MaintenanceReportCard({ session }: { session: SessionResultResponse }) {
  const { download, isDownloading } = useReportDownload(session)
  const fileName = getReportFileName(session)

  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-semibold text-foreground">Biên bản đính kèm</h2>
      <div className="flex items-center gap-3 rounded-xl border p-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-all text-sm font-medium text-foreground">{fileName}</p>
          <p className="text-xs text-muted-foreground">Tạo từ kết quả check-out</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => void download()}
          disabled={isDownloading}
          aria-label={`Tải ${fileName}`}
          title="Tải biên bản PDF"
        >
          {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
        </Button>
      </div>
    </Card>
  )
}

interface MaintenanceNotesCardProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /** False when the vehicle has no completed rental to attach the notes to. */
  canSave: boolean
}

/** "Ghi chú sửa chữa": saved on the rental that sent the vehicle to maintenance when "Đã sửa xong" is confirmed. */
export function MaintenanceNotesCard({ value, onChange, disabled = false, canSave }: MaintenanceNotesCardProps) {
  const length = value.length
  return (
    <Card className="space-y-3 p-5">
      <label htmlFor="maintenance-notes" className="block font-semibold text-foreground">
        Ghi chú sửa chữa
      </label>
      <Textarea
        id="maintenance-notes"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={MAINTENANCE_NOTES_MAX_LENGTH}
        rows={5}
        disabled={disabled}
        placeholder="Ví dụ: Đã đánh bóng cản trước, sơn dặm cửa phải…"
        aria-describedby="maintenance-notes-hint"
      />
      <div id="maintenance-notes-hint" className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
        {canSave ? (
          <span>Ghi chú được lưu khi bấm “Đã sửa xong”.</span>
        ) : (
          <span className="flex items-start gap-1.5 text-amber-700">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" />
            Xe không có lượt thuê đã hoàn tất nên ghi chú sẽ không được lưu.
          </span>
        )}
        <span className={cn('shrink-0 tabular-nums', length >= MAINTENANCE_NOTES_MAX_LENGTH && 'font-medium text-amber-700')}>
          {length}/{MAINTENANCE_NOTES_MAX_LENGTH}
        </span>
      </div>
    </Card>
  )
}
