import { CalendarClock, Phone, User } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'
import { toDateTimeLocal, type RenterFormErrors, type RenterFormValues } from './renterForm'
import { SectionCardHeader } from './SectionCardHeader'

interface RenterInfoCardProps {
  values: RenterFormValues
  errors: RenterFormErrors
  onChange: <K extends keyof RenterFormValues>(field: K, value: RenterFormValues[K]) => void
}

export function RenterInfoCard({ values, errors, onChange }: RenterInfoCardProps) {
  const [minReturnAt] = useState(() => toDateTimeLocal(new Date()))

  return (
    <Card>
      <SectionCardHeader
        icon={<User />}
        title="Thông tin người thuê"
        description="Nhập họ tên, số điện thoại và thời hạn thuê."
      />
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <FormField label="Họ và tên" required error={errors.renterName}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              value={values.renterName}
              onChange={(event) => onChange('renterName', event.target.value)}
            />
          )}
        </FormField>

        <FormField label="Số điện thoại" required error={errors.renterPhone} icon={<Phone />}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0901 234 567"
              className="pl-9"
              value={values.renterPhone}
              onChange={(event) => onChange('renterPhone', event.target.value)}
            />
          )}
        </FormField>

        <FormField
          label="Ngày giờ trả dự kiến"
          required
          error={errors.expectedReturnAt}
          icon={<CalendarClock />}
          className="sm:col-span-2"
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="datetime-local"
              min={minReturnAt}
              className="pl-9"
              value={values.expectedReturnAt}
              onChange={(event) => onChange('expectedReturnAt', event.target.value)}
            />
          )}
        </FormField>

        <FormField label="Ghi chú bàn giao" className="sm:col-span-2">
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              rows={3}
              placeholder="Ví dụ: Xe đầy bình xăng, 1 chìa khóa dự phòng..."
              value={values.handoverNotes}
              onChange={(event) => onChange('handoverNotes', event.target.value)}
            />
          )}
        </FormField>
      </div>
    </Card>
  )
}
