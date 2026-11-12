import { AlertCircle, ArrowLeft, RotateCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SelectVehiclePrompt } from '@/components/inspection/SelectVehiclePrompt'
import { VehicleSummaryCard } from '@/components/inspection/VehicleSummaryCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useSessionResults } from '@/hooks/useSessionResults'
import { getActiveDamages } from '@/lib/damage'
import type { UUID } from '@/types'
import { AiProgressCard } from './AiProgressCard'
import { CheckOutPageHeader } from './checkOutLayout'
import { CHECK_OUT_STEPS } from './checkOutSteps'
import { DamageResultPlaceholder } from './DamageResultPlaceholder'
import { NoDamageResult } from './NoDamageResult'

/**
 * `/staff/check-out?sessionId=…`: shows AI progress (mockup 08) until the AI is DONE, then the result
 * (mockup 09, or the damage placeholder). Everything is rebuilt from the API, so F5 keeps the state.
 */
export function CheckOutSessionView({ sessionId }: { sessionId: UUID }) {
  const { data: session, isLoading, error, refetch } = useSessionResults(sessionId)

  if (isLoading || (!session && !error)) {
    return (
      <section className="mx-auto max-w-6xl space-y-6">
        <CheckOutPageHeader title="Check-out · Nhận lại xe" description="Đang tải phiên check-out…" />
        <SelectVehiclePrompt isLoading loadingText="Đang tải phiên check-out…" />
      </section>
    )
  }

  if (!session) {
    return (
      <section className="mx-auto max-w-6xl space-y-6">
        <CheckOutPageHeader title="Check-out · Nhận lại xe" description="Không mở được phiên check-out." />
        <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
          <AlertCircle className="h-6 w-6 shrink-0 text-destructive" />
          <p className="flex-1 text-sm text-muted-foreground">Không tải được phiên check-out: {error}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={refetch}>
              <RotateCw />
              Thử lại
            </Button>
            <Button asChild variant="ghost">
              <Link to="/staff">
                <ArrowLeft />
                Về danh sách xe
              </Link>
            </Button>
          </div>
        </Card>
      </section>
    )
  }

  if (session.sessionType !== 'CHECK_OUT') {
    return (
      <section className="mx-auto max-w-6xl space-y-6">
        <CheckOutPageHeader title="Check-out · Nhận lại xe" description="Liên kết không phải phiên check-out." />
        <SelectVehiclePrompt reason="Liên kết này không trỏ tới một phiên check-out." />
      </section>
    )
  }

  const isAiDone = session.aiStatus === 'DONE'
  const hasDamage = getActiveDamages(session.images).length > 0

  return (
    <section className="mx-auto max-w-6xl space-y-6 pb-28">
      <CheckOutPageHeader
        title={isAiDone ? 'Check-out · Kết quả kiểm tra' : 'Check-out · Nhận lại xe'}
        description={
          isAiDone
            ? 'Kết quả so sánh ngoại thất giữa lúc nhận và lúc trả xe.'
            : 'AI đang so sánh ảnh trả xe với ảnh gốc lúc check-in.'
        }
      />

      <VehicleSummaryCard
        vehicle={session.vehicle}
        renterName={session.renterName}
        steps={CHECK_OUT_STEPS}
        step={isAiDone ? 3 : 2}
        stepsLabel="Các bước check-out"
      />

      {!isAiDone ? (
        <AiProgressCard sessionId={session.sessionId} onDone={refetch} />
      ) : hasDamage ? (
        <DamageResultPlaceholder session={session} />
      ) : (
        <NoDamageResult session={session} onRefresh={refetch} />
      )}
    </section>
  )
}
