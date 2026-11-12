import { useSearchParams } from 'react-router-dom'
import { SelectVehiclePrompt } from '@/components/inspection/SelectVehiclePrompt'
import { CheckOutCaptureStep } from './check-out/CheckOutCaptureStep'
import { CheckOutPageHeader } from './check-out/checkOutLayout'
import { CheckOutSessionView } from './check-out/CheckOutSessionView'

/**
 * Check-out flow. State lives in the URL so a reload never loses it:
 * `?bookingId=…` → capture the 8 return photos (mockup 07);
 * `?sessionId=…` → AI progress / result of the submitted check-out (mockups 08, 09).
 */
export default function CheckOut() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const bookingId = searchParams.get('bookingId')

  if (sessionId) return <CheckOutSessionView key={sessionId} sessionId={sessionId} />
  if (bookingId) return <CheckOutCaptureStep key={bookingId} bookingId={bookingId} />

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <CheckOutPageHeader
        title="Check-out · Nhận lại xe"
        description="Chọn một xe ở tab Đang thuê để bắt đầu nhận lại xe."
      />
      <SelectVehiclePrompt reason="Chưa chọn xe để check-out." />
    </section>
  )
}
