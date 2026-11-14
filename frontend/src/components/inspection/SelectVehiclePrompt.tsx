import { ArrowLeft, Car, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface SelectVehiclePromptProps {
  /** Shows a spinner instead of the prompt while the vehicle / session is loading. */
  isLoading?: boolean
  loadingText?: string
  /** Why no vehicle could be shown (e.g. it is no longer available). */
  reason?: string
}

/**
 * Shown by the check-in / check-out pages when they are opened without a usable vehicle
 * (direct URL, stale link): asks the staff to pick a vehicle from the dashboard.
 */
export function SelectVehiclePrompt({ isLoading = false, loadingText = 'Đang tải thông tin xe…', reason }: SelectVehiclePromptProps) {
  return (
    <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Car className="h-6 w-6" />}
      </span>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{loadingText}</p>
      ) : (
        <>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-foreground">Hãy chọn xe từ danh sách</p>
            {reason && <p className="text-sm text-muted-foreground">{reason}</p>}
          </div>
          <Button asChild variant="secondary">
            <Link to="/staff">
              <ArrowLeft />
              Về danh sách xe
            </Link>
          </Button>
        </>
      )}
    </Card>
  )
}
