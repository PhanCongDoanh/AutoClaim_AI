import { Loader2, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Saved verbatim as `override_reason` (decision F6). */
const PRESET_REASONS = ['Bóng phản chiếu / ánh sáng', 'Bụi bẩn, vết nước', 'Hư hại đã có từ trước'] as const
const OTHER = 'other'
const OTHER_PREFIX = 'Lý do khác: '
/** `override_reason` is VARCHAR(255); keeps "Lý do khác: …" within it. */
const OTHER_MAX_LENGTH = 200

type ReasonChoice = (typeof PRESET_REASONS)[number] | typeof OTHER

interface OverrideDamageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** e.g. "#1 Trầy xước · Cửa trước trái". */
  damageTitle: string
  isPending: boolean
  onConfirm: (overrideReason: string) => void
}

/** Mockup 12: confirm removing a damage the AI got wrong, with a required reason. */
export function OverrideDamageDialog({ open, onOpenChange, damageTitle, isPending, onConfirm }: OverrideDamageDialogProps) {
  const [choice, setChoice] = useState<ReasonChoice>(PRESET_REASONS[0])
  const [otherText, setOtherText] = useState('')
  const [showOtherError, setShowOtherError] = useState(false)
  const nameId = useId()
  const otherInputId = useId()

  const trimmedOther = otherText.trim()
  const reason = choice === OTHER ? `${OTHER_PREFIX}${trimmedOther}` : choice

  function handleConfirm() {
    if (choice === OTHER && !trimmedOther) {
      setShowOtherError(true)
      return
    }
    onConfirm(reason)
  }

  const options: { value: ReasonChoice; label: string }[] = [
    ...PRESET_REASONS.map((value) => ({ value, label: value })),
    { value: OTHER, label: 'Lý do khác' },
  ]

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent className="max-w-lg">
        <div className="flex gap-4 p-6 pb-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Trash2 className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <AlertDialogTitle>Xoá lỗi do AI nhận nhầm?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{damageTitle}</strong> sẽ bị loại khỏi biên bản.
            </AlertDialogDescription>
          </div>
        </div>

        <fieldset className="space-y-2 px-6 pb-5" disabled={isPending}>
          <legend className="mb-2 text-sm font-medium text-foreground">Lý do</legend>
          {options.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                choice === option.value
                  ? 'border-brand-600 bg-brand-50 text-foreground'
                  : 'hover:bg-accent hover:text-foreground',
              )}
            >
              <input
                type="radio"
                name={nameId}
                value={option.value}
                checked={choice === option.value}
                onChange={() => {
                  setChoice(option.value)
                  setShowOtherError(false)
                }}
                className="h-4 w-4 accent-brand-600"
              />
              {option.label}
            </label>
          ))}

          {choice === OTHER && (
            <div className="space-y-1 pt-1">
              <label htmlFor={otherInputId} className="sr-only">
                Nội dung lý do khác
              </label>
              <textarea
                id={otherInputId}
                autoFocus
                rows={3}
                maxLength={OTHER_MAX_LENGTH}
                value={otherText}
                onChange={(event) => {
                  setOtherText(event.target.value)
                  if (event.target.value.trim()) setShowOtherError(false)
                }}
                placeholder="Nhập lý do (bắt buộc)…"
                aria-invalid={showOtherError}
                className={cn(
                  'w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  showOtherError && 'border-destructive',
                )}
              />
              <div className="flex justify-between text-xs">
                <span className="text-destructive">{showOtherError ? 'Vui lòng nhập lý do.' : ''}</span>
                <span className="tabular-nums text-muted-foreground">
                  {otherText.length}/{OTHER_MAX_LENGTH}
                </span>
              </div>
            </div>
          )}
        </fieldset>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <AlertDialogCancel disabled={isPending}>Huỷ</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Có, xoá lỗi này
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
