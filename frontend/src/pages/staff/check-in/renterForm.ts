import type { CheckInRequest, UUID } from '@/types'

export interface RenterFormValues {
  renterName: string
  renterPhone: string
  /** `datetime-local` value: `YYYY-MM-DDTHH:mm`. */
  expectedReturnAt: string
  handoverNotes: string
}

export type RenterFormErrors = Partial<Record<keyof RenterFormValues, string>>

export const INITIAL_RENTER_VALUES: RenterFormValues = {
  renterName: '',
  renterPhone: '',
  expectedReturnAt: '',
  handoverNotes: '',
}

const PHONE_PATTERN = /^(0|\+84)\d{9}$/

function normalizePhone(phone: string): string {
  return phone.replace(/[\s.-]/g, '')
}

export function toDateTimeLocal(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

export function validateRenter(values: RenterFormValues): RenterFormErrors {
  const errors: RenterFormErrors = {}
  if (!values.renterName.trim()) errors.renterName = 'Vui lòng nhập họ tên người thuê.'

  if (!values.renterPhone.trim()) {
    errors.renterPhone = 'Vui lòng nhập số điện thoại.'
  } else if (!PHONE_PATTERN.test(normalizePhone(values.renterPhone))) {
    errors.renterPhone = 'Số điện thoại không hợp lệ, ví dụ 0901234567.'
  }

  if (!values.expectedReturnAt) {
    errors.expectedReturnAt = 'Vui lòng chọn ngày giờ trả xe.'
  } else if (new Date(values.expectedReturnAt) <= new Date()) {
    errors.expectedReturnAt = 'Thời gian trả xe phải ở tương lai.'
  }
  return errors
}

export function toCheckInRequest(vehicleId: UUID, values: RenterFormValues): CheckInRequest {
  return {
    vehicleId,
    renterName: values.renterName.trim(),
    renterPhone: normalizePhone(values.renterPhone),
    // The backend parses `LocalDateTime`, so send local time without a timezone suffix.
    expectedReturnAt: `${values.expectedReturnAt}:00`,
    handoverNotes: values.handoverNotes.trim() || undefined,
  }
}
