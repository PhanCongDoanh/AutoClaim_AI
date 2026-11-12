import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConfirmActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  icon?: ReactNode
  /** `success` (green, e.g. "Hoàn tất trả xe") or `destructive` (red, e.g. discarding photos). */
  tone?: 'success' | 'destructive'
  /** Keeps the dialog open with a spinner until the action settles. */
  isPending?: boolean
  onConfirm: () => void
}

/** Confirmation before an irreversible step of the check-out flow. */
export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Huỷ',
  icon,
  tone = 'success',
  isPending = false,
  onConfirm,
}: ConfirmActionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <div className="flex gap-4 p-6">
          {icon && (
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full [&_svg]:h-5 [&_svg]:w-5',
                tone === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
              )}
            >
              {icon}
            </span>
          )}
          <div className="space-y-2">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>{description}</div>
            </AlertDialogDescription>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          <Button
            variant={tone === 'destructive' ? 'destructive' : 'primary'}
            className={cn(tone === 'success' && 'bg-emerald-600 text-white hover:bg-emerald-700')}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
