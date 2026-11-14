import { Camera, Check, Loader2, RotateCcw, TriangleAlert } from 'lucide-react'
import { useRef, type ChangeEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { PhotoSlot } from '@/hooks/usePhotoCapture'
import { cn } from '@/lib/utils'

interface PhotoCaptureBoxProps {
  label: string
  slot: PhotoSlot
  onSelect: (file: File) => void
  /**
   * `document`: label row + ID-card shaped frame + retake link (CCCD).
   * `angle`: numbered card with label and capture time in the footer (vehicle angles).
   */
  variant?: 'document' | 'angle'
  /** 1-based angle number shown in the `angle` variant. */
  index?: number
  /** Placeholder art for the empty state. */
  placeholder?: ReactNode
  disabled?: boolean
  /** Original (check-in) photo of this angle, shown small in the bottom-right corner as a framing guide. */
  referenceUrl?: string
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function PhotoCaptureBox({
  label,
  slot,
  onSelect,
  variant = 'angle',
  index,
  placeholder,
  disabled = false,
  referenceUrl,
}: PhotoCaptureBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { photo, isCompressing, error } = slot
  const isReady = Boolean(photo) && !isCompressing

  function openPicker() {
    if (!disabled && !isCompressing) inputRef.current?.click()
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so selecting the same file again still fires `change`.
    event.target.value = ''
    if (file) onSelect(file)
  }

  const frame = (
    <button
      type="button"
      onClick={openPicker}
      disabled={disabled || isCompressing}
      aria-label={photo ? `Chụp lại ${label}` : `Chụp ${label}`}
      className={cn(
        'group relative flex w-full items-center justify-center overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:cursor-not-allowed',
        variant === 'document'
          ? 'aspect-[1.6] rounded-xl border-2 bg-[#f5f7fb] p-3'
          : 'aspect-[16/10] bg-[#f4f6fa]',
        variant === 'document' && (photo ? 'border-solid border-emerald-200 p-1.5' : 'border-dashed border-slate-200'),
        !photo && 'enabled:hover:bg-[#edf2fc]',
        !photo && variant === 'document' && 'enabled:hover:border-brand-500/40',
        error && !photo && 'border-red-300 bg-red-50/60',
      )}
    >
      {photo ? (
        <img
          src={photo.previewUrl}
          alt={label}
          className={cn('h-full w-full object-cover', variant === 'document' && 'rounded-lg')}
        />
      ) : (
        <span className="flex flex-col items-center gap-3 text-slate-400">
          {placeholder ?? (
            <Camera className="h-7 w-7 text-slate-500 transition-transform group-hover:scale-110" strokeWidth={1.75} />
          )}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-semibold text-brand-600',
              variant === 'document' ? 'text-[13px]' : 'text-xs',
            )}
          >
            <Camera className={variant === 'document' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
            Chạm để chụp
          </span>
        </span>
      )}

      {isCompressing && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 text-xs font-medium text-slate-600 backdrop-blur-sm">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          Đang nén ảnh…
        </span>
      )}

      {variant === 'angle' && index !== undefined && (
        <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-700 px-1.5 text-xs font-bold text-white shadow-sm">
          {index}
        </span>
      )}

      {variant === 'angle' && referenceUrl && (
        <span className="pointer-events-none absolute bottom-2 right-2 w-1/4 min-w-12 overflow-hidden rounded-md border-2 border-white bg-muted shadow-md">
          <img src={referenceUrl} alt={`Ảnh gốc check-in: ${label}`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
        </span>
      )}

      {variant === 'angle' && isReady && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
  )

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      hidden
      onChange={handleChange}
    />
  )

  if (variant === 'document') {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-slate-800">{label}</p>
          {isReady && <CapturedBadge />}
        </div>
        {frame}
        {input}
        {(error || photo) && (
          <div className="flex min-h-7 items-center justify-end">
            {error ? (
              <ErrorText message={error} />
            ) : (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-7 px-0 font-semibold text-brand-600"
                onClick={openPicker}
                disabled={disabled || isCompressing}
              >
                <RotateCcw />
                Chụp lại
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-[0_8px_20px_-12px_rgba(30,64,175,0.35)]',
        photo ? 'border-solid border-emerald-200' : 'border-dashed border-slate-300',
        error && 'border-red-300',
      )}
    >
      {frame}
      {input}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2.5">
        <p className="truncate text-[13px] font-semibold text-slate-800">{label}</p>
        {error ? (
          <TriangleAlert className="h-4 w-4 shrink-0 text-destructive" aria-label={error} />
        ) : (
          photo && <time className="shrink-0 text-xs text-slate-500">{formatTime(photo.capturedAt)}</time>
        )}
      </div>
    </div>
  )
}

function CapturedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
      <Check className="h-3 w-3" strokeWidth={3} />
      Đã chụp
    </span>
  )
}

function ErrorText({ message }: { message: string }) {
  return (
    <p className="inline-flex items-center gap-1 text-xs text-destructive">
      <TriangleAlert className="h-3.5 w-3.5" />
      {message}
    </p>
  )
}
