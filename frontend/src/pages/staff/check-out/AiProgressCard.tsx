import { ArrowLeft, Check, CircleAlert, Loader2, RotateCw, Sparkles, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ANGLE_LABELS, VEHICLE_PHOTO_KEYS } from '@/components/inspection/photoAngles'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAiProgress } from '@/hooks/useAiProgress'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/services/apiClient'
import { inspectionService } from '@/services/inspectionService'
import type { AiProgress, AngleCode, UUID } from '@/types'

type AngleState = 'waiting' | 'active' | 'done'

interface AiProgressCardProps {
  sessionId: UUID
  /** Called once the AI reports DONE, so the page can load the results. */
  onDone: () => void
}

/**
 * Mockup 08 (adjusted): real progress % and the real state of each of the 8 angles.
 * FAILED, or no final status after 3 minutes, shows a friendly error with "Thử lại".
 */
export function AiProgressCard({ sessionId, onDone }: AiProgressCardProps) {
  const { progress, timedOut, pollError, restart } = useAiProgress(sessionId)
  const [isRetrying, setIsRetrying] = useState(false)

  const status = progress?.status
  useEffect(() => {
    if (status === 'DONE') onDone()
  }, [status, onDone])

  const isFailed = status === 'FAILED'
  const showError = isFailed || (timedOut && status !== 'DONE')

  async function handleRetry() {
    setIsRetrying(true)
    try {
      await inspectionService.retryAi(sessionId)
      toast.success('Đã gửi lại yêu cầu phân tích cho AI')
      restart()
    } catch (err) {
      toast.error('Chưa chạy lại được AI', { description: getErrorMessage(err) })
    } finally {
      setIsRetrying(false)
    }
  }

  const percent = status === 'DONE' ? 100 : (progress?.progress ?? 0)

  return (
    <Card className="mx-auto max-w-2xl overflow-hidden">
      <div className="space-y-5 bg-gradient-to-b from-brand-50/70 to-card px-6 py-8 text-center sm:px-10">
        <span
          className={cn(
            'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md',
            showError ? 'bg-red-500' : 'bg-brand-600',
          )}
        >
          {showError ? <CircleAlert className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}
        </span>

        {showError ? (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              {isFailed ? 'AI chưa phân tích được ảnh trả xe' : 'AI xử lý lâu hơn bình thường'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isFailed
                ? 'Có thể dịch vụ AI vừa khởi động lại hoặc tạm thời không truy cập được. Ảnh trả xe đã được lưu, bạn có thể thử lại.'
                : 'Đã hơn 3 phút mà AI chưa trả kết quả. Bạn có thể chờ thêm hoặc thử chạy lại.'}
            </p>
            {progress?.error && (
              <p className="mx-auto max-w-md break-words rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                Chi tiết: {progress.error}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button asChild variant="secondary">
                <Link to="/staff">
                  <ArrowLeft />
                  Về danh sách xe
                </Link>
              </Button>
              <Button onClick={handleRetry} disabled={isRetrying}>
                {isRetrying ? <Loader2 className="animate-spin" /> : <RotateCw />}
                Thử lại
              </Button>
            </div>
          </div>
        ) : (
          <h2 className="text-lg font-semibold text-foreground">
            {status === 'DONE' ? 'AI đã phân tích xong' : 'AI đang kiểm tra hư hại…'}
          </h2>
        )}

        {!isFailed && (
          <div className="mx-auto max-w-md space-y-1.5 text-left">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tiến độ</span>
              <span className="font-semibold tabular-nums text-brand-600">{percent}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label="Tiến độ AI phân tích"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <StatusHint progress={progress} pollError={pollError} />
          </div>
        )}
      </div>

      {!isFailed && (
        <ol className="grid gap-2 border-t px-6 py-5 sm:grid-cols-2 sm:px-10" aria-label="Tiến độ theo góc chụp">
          {VEHICLE_PHOTO_KEYS.map((key, index) => (
            <AngleRow key={key} index={index + 1} angle={key} state={getAngleState(progress, key)} />
          ))}
        </ol>
      )}
    </Card>
  )
}

function getAngleState(progress: AiProgress | null, angle: AngleCode): AngleState {
  if (!progress) return 'waiting'
  if (progress.status === 'DONE') return 'done'
  if (progress.completedAngles.includes(angle)) return 'done'
  if (progress.currentAngle === angle) return 'active'
  return 'waiting'
}

function StatusHint({ progress, pollError }: { progress: AiProgress | null; pollError: string | null }) {
  if (pollError) {
    return (
      <p className="flex items-center justify-end gap-1.5 text-xs text-amber-700">
        <WifiOff className="h-3.5 w-3.5" />
        Mất kết nối tạm thời, đang thử lại…
      </p>
    )
  }
  let text = 'Đang kết nối với AI…'
  if (progress?.status === 'PENDING') text = 'Đang chờ AI bắt đầu phân tích…'
  if (progress?.status === 'PROCESSING') {
    text = progress.live
      ? `Đã xong ${progress.completedAngles.length}/${progress.totalAngles ?? VEHICLE_PHOTO_KEYS.length} góc`
      : 'AI đang xử lý (chưa lấy được chi tiết từng góc)…'
  }
  if (progress?.status === 'DONE') text = 'Hoàn tất, đang tải kết quả…'
  return <p className="text-right text-xs text-muted-foreground">{text}</p>
}

function AngleRow({ index, angle, state }: { index: number; angle: AngleCode; state: AngleState }) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
        state === 'active' && 'border-brand-500/40 bg-brand-50',
        state === 'done' && 'border-emerald-200 bg-emerald-50/50',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          state === 'waiting' && 'border text-muted-foreground',
          state === 'active' && 'bg-brand-100 text-brand-700',
          state === 'done' && 'bg-emerald-500 text-white',
        )}
      >
        {state === 'done' ? (
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        ) : state === 'active' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          index
        )}
      </span>
      <span className={cn('flex-1 font-medium', state === 'waiting' ? 'text-muted-foreground' : 'text-foreground')}>
        {ANGLE_LABELS[angle]}
      </span>
      <span
        className={cn(
          'text-xs',
          state === 'waiting' && 'text-muted-foreground',
          state === 'active' && 'font-medium text-brand-700',
          state === 'done' && 'text-emerald-700',
        )}
      >
        {state === 'done' ? 'Xong' : state === 'active' ? 'Đang xử lý' : 'Chờ'}
      </span>
    </li>
  )
}
