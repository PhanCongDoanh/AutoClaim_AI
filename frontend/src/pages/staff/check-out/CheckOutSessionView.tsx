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
import { CHECK_OUT_REPORT_STEPS, CHECK_OUT_STEPS } from './checkOutSteps'
import { DamageReviewResult } from './damage-review/DamageReviewResult'
import { NoDamageResult } from './NoDamageResult'
import { ReportResult } from './ReportResult'

type Screen = 'progress' | 'noDamage' | 'review' | 'report'

const HEADERS: Record<Screen, { title: string; description: string }> = {
  progress: { title: 'Check-out · Nhận lại xe', description: 'AI đang so sánh ảnh trả xe với ảnh gốc lúc check-in.' },
  noDamage: {
    title: 'Check-out · Kết quả kiểm tra',
    description: 'Kết quả so sánh ngoại thất giữa lúc nhận và lúc trả xe.',
  },
  review: {
    title: 'Check-out · Kết quả kiểm tra',
    description: 'Kiểm tra lại từng hư hại AI phát hiện. Xoá những lỗi AI nhận nhầm trước khi xuất biên bản.',
  },
  report: {
    title: 'Biên bản hư hại đã được tạo',
    description: 'Tải PDF để lưu hoặc in cho khách ký. Xe đã tự động chuyển sang tab Bảo trì.',
  },
}

/**
 * `/staff/check-out?sessionId=…`: AI progress (mockup 08) until the AI is DONE, then the result: 09 (no damage),
 * 11 (review damages) or 13 (report, once the booking is closed). Everything is rebuilt from the API, so F5 keeps
 * the current screen.
 */
export function CheckOutSessionView({ sessionId }: { sessionId: UUID }) {
  const { data: session, isLoading, error, refetch, mutate } = useSessionResults(sessionId)

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
  const isCompleted = session.bookingStatus === 'COMPLETED'
  // DONE + damage: review (11) until the booking is closed, then the report (13). No damage left → 09.
  const screen = !isAiDone ? 'progress' : !hasDamage ? 'noDamage' : isCompleted ? 'report' : 'review'
  const header = HEADERS[screen]

  return (
    <section className="mx-auto max-w-6xl space-y-6 pb-28">
      <CheckOutPageHeader title={header.title} description={header.description} />

      <VehicleSummaryCard
        vehicle={session.vehicle}
        renterName={session.renterName}
        steps={screen === 'report' ? CHECK_OUT_REPORT_STEPS : CHECK_OUT_STEPS}
        step={screen === 'progress' ? 2 : screen === 'report' ? 4 : 3}
        stepsLabel="Các bước check-out"
      />

      {screen === 'progress' && <AiProgressCard sessionId={session.sessionId} onDone={refetch} />}
      {screen === 'noDamage' && <NoDamageResult session={session} onRefresh={refetch} />}
      {screen === 'review' && <DamageReviewResult session={session} onSessionChange={mutate} onRefresh={refetch} />}
      {screen === 'report' && <ReportResult session={session} />}
    </section>
  )
}
