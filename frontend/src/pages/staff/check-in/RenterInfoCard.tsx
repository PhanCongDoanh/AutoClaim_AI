import { CalendarClock, Phone, User } from 'lucide-react'
import { useState } from 'react'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toDateTimeLocal, type RenterFormErrors, type RenterFormValues } from './renterForm'
import { CHECK_IN_CARD_CLASS, CHECK_IN_INPUT_CLASS, SectionCardHeader } from './SectionCardHeader'

interface RenterInfoCardProps {
  values: RenterFormValues
  errors: RenterFormErrors
  onChange: <K extends keyof RenterFormValues>(field: K, value: RenterFormValues[K]) => void
}

/** Bold labels with a red required asterisk. */
const LABEL_CLASS = 'text-[14px] font-semibold text-slate-800 [&>span]:text-red-500'

export function RenterInfoCard({ values, errors, onChange }: RenterInfoCardProps) {
  const [minReturnAt] = useState(() => toDateTimeLocal(new Date()))

  return (
    <div className={CHECK_IN_CARD_CLASS}>
      <SectionCardHeader
        icon={<User />}
        title="Thông tin người thuê"
        description="Nhập họ tên, số điện thoại và thời hạn thuê."
      />
      <div className="grid gap-x-4 gap-y-4 p-5 sm:grid-cols-2">
        <FormField label="Họ và tên" required error={errors.renterName} labelClassName={LABEL_CLASS}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              className={CHECK_IN_INPUT_CLASS}
              value={values.renterName}
              onChange={(event) => onChange('renterName', event.target.value)}
            />
          )}
        </FormField>

        <FormField
          label="Số điện thoại"
          required
          error={errors.renterPhone}
          icon={<Phone />}
          labelClassName={LABEL_CLASS}
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0901 234 567"
              className={cn(CHECK_IN_INPUT_CLASS, 'pl-10')}
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
          labelClassName={LABEL_CLASS}
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="datetime-local"
              min={minReturnAt}
              className={cn(CHECK_IN_INPUT_CLASS, 'pl-10')}
              value={values.expectedReturnAt}
              onChange={(event) => onChange('expectedReturnAt', event.target.value)}
            />
          )}
        </FormField>

        <FormField label="Ghi chú bàn giao" className="sm:col-span-2" labelClassName={LABEL_CLASS}>
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              rows={2}
              placeholder="Ví dụ: Xe đầy bình xăng, 1 chìa khóa dự phòng..."
              className={cn(CHECK_IN_INPUT_CLASS, 'h-auto min-h-[76px] resize-y py-2.5')}
              value={values.handoverNotes}
              onChange={(event) => onChange('handoverNotes', event.target.value)}
            />
          )}
        </FormField>
      </div>
    </div>
  )
}
