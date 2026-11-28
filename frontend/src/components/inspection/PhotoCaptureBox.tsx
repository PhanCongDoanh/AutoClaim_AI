import { Camera, Check, Eye, Loader2, RotateCcw, TriangleAlert, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
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
  /** Original (check-in) photo of this angle, shown small in the bottom-right corner during check-out. */
  referenceUrl?: string
  /** Static demo guide image for Check-in. */
  demoImageUrl?: string
  /** Inspection session type */
  sessionType?: 'CHECK_IN' | 'CHECK_OUT'
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
  demoImageUrl,
  sessionType = 'CHECK_IN',
}: PhotoCaptureBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isEnlarged, setIsEnlarged] = useState(false)
  const { photo, isCompressing, status, validationResult, error } = slot

  const isValidating = isCompressing || status === 'VALIDATING'
  const isValid = status === 'VALID'
  const isInvalid = status === 'INVALID'
  const isError = status === 'ERROR'
  const isReady = variant === 'document' ? Boolean(photo) && !isValidating && !error && isValid : isValid

  function openPicker() {
    if (!disabled && !isValidating) inputRef.current?.click()
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so selecting the same file again still fires `change`.
    event.target.value = ''
    if (file) onSelect(file)
  }

  const isCheckIn = sessionType === 'CHECK_IN'

  const frame = (
    <button
      type="button"
      onClick={openPicker}
      disabled={disabled || isValidating}
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
      ) : isCheckIn && demoImageUrl && variant === 'angle' ? (
        <div className="relative h-full w-full">
          <img
            src={demoImageUrl}
            alt={`Ảnh mẫu hướng dẫn: ${label}`}
            className="h-full w-full object-cover opacity-85 transition-opacity group-hover:opacity-95"
          />
          <span className="absolute right-2 top-2 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-white shadow backdrop-blur-sm">
            Ảnh mẫu hướng dẫn
          </span>
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-md backdrop-blur-sm group-hover:scale-105 transition-transform">
              <Camera className="h-4 w-4 text-brand-600" />
              Chọn hoặc Chụp ảnh
            </span>
          </div>
        </div>
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

      {isValidating && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/65 p-2 text-center text-xs font-semibold text-white backdrop-blur-[2px]">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
          <span>{isCompressing ? 'Đang nén ảnh…' : 'Đang kiểm tra góc chụp…'}</span>
        </span>
      )}

      {variant === 'angle' && index !== undefined && (
        <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-800/90 px-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-sm">
          {index}
        </span>
      )}

      {/* Check-out thumbnail: Confirmed Check-in reference image with click-to-enlarge */}
      {!isCheckIn && variant === 'angle' && referenceUrl && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsEnlarged(true)
          }}
          title="Bấm để xem ảnh phóng to lúc giao xe"
          aria-label={`Xem ảnh lúc giao xe: ${label}`}
          className="group/thumb absolute bottom-2 right-2 w-1/4 min-w-16 overflow-hidden rounded-md border-2 border-white bg-slate-900 shadow-md transition-transform hover:scale-105 cursor-pointer"
        >
          <img src={referenceUrl} alt={`Ảnh lúc giao xe: ${label}`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[9px] font-medium text-white flex items-center justify-center gap-0.5">
            <Eye className="h-2.5 w-2.5" />
            Ảnh giao xe
          </span>
        </button>
      )}

      {variant === 'angle' && !isValidating && (
        <>
          {isValid && (
            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          )}
          {isInvalid && (
            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm ring-2 ring-white">
              <TriangleAlert className="h-3.5 w-3.5 text-white" />
            </span>
          )}
          {isError && (
            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm ring-2 ring-white">
              <TriangleAlert className="h-3.5 w-3.5 text-white" />
            </span>
          )}
        </>
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
                disabled={disabled || isValidating}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Chụp lại
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div
        className={cn(
          'overflow-hidden rounded-xl border transition-all',
          photo && isValid && 'border-emerald-300 ring-1 ring-emerald-400/20 shadow-sm',
          photo && isInvalid && 'border-red-300 ring-1 ring-red-400/30 bg-red-50/10',
          photo && isError && 'border-amber-300 bg-amber-50/10',
          photo && isValidating && 'border-blue-300',
          !photo && 'border-dashed border-slate-300 bg-white',
        )}
      >
        {frame}
        {input}

        {/* Footer Info */}
        {isValid && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-white px-3 py-2">
            <p className="truncate text-[13px] font-semibold text-slate-800">{label}</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Đạt chuẩn
              </span>
              <time className="text-[11px] text-slate-400">{photo && formatTime(photo.capturedAt)}</time>
            </div>
          </div>
        )}

        {(isInvalid || isError) && (
          <div className="flex flex-col gap-1.5 border-t border-red-100 bg-red-50/60 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[13px] font-semibold text-red-900">{label}</p>
              <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                <TriangleAlert className="h-3 w-3" />
                {isInvalid ? 'Chưa đạt' : 'Lỗi'}
              </span>
            </div>
            <p className="text-[11px] leading-snug text-red-600">
              {error || validationResult?.message || 'Ảnh chưa đạt yêu cầu kiểm định.'}
            </p>
            <div className="mt-0.5 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px] font-semibold text-red-700 border-red-200 hover:bg-red-100"
                onClick={openPicker}
                disabled={disabled || isValidating}
              >
                <RotateCcw className="h-3 w-3" />
                Chụp lại
              </Button>
            </div>
          </div>
        )}

        {!isValid && !isInvalid && !isError && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-white px-3 py-2.5">
            <p className="truncate text-[13px] font-semibold text-slate-800">{label}</p>
            <span className="text-[11px] text-slate-400">
              {isValidating ? 'Đang kiểm tra góc chụp…' : 'Chưa chụp'}
            </span>
          </div>
        )}
      </div>

      {/* Reference Image Enlarge Modal */}
      {isEnlarged && referenceUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsEnlarged(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">Ảnh đối chứng lúc giao xe: {label}</h3>
              <button
                type="button"
                onClick={() => setIsEnlarged(false)}
                className="rounded-full p-1 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 bg-slate-950 flex items-center justify-center">
              <img
                src={referenceUrl}
                alt={`Ảnh đối chứng: ${label}`}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
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
