import { Car, Check, User, Users } from 'lucide-react'
import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import type { VehicleResponse } from '@/types'
import { CHECK_IN_CARD_CLASS } from './SectionCardHeader'

const STEPS = ['Thông tin khách & CCCD', 'Chụp 8 góc xe'] as const

interface VehicleSummaryCardProps {
  vehicle: VehicleSummary
  /** Step labels of the current workflow, in order. */
  steps: readonly string[]
  /** 1-based active step; steps before it are shown as done. */
  step: number
  /** Optional renter name shown next to the seat count (check-out). */
  renterName?: string | null
  /** Accessible name of the step list, e.g. "Các bước check-out". */
  stepsLabel?: string
}

/** Vehicle header card with a horizontal stepper, shared by the check-in and check-out flows. */
export function VehicleSummaryCard({
  vehicle,
  steps,
  step,
  renterName,
  stepsLabel = 'Các bước thực hiện',
}: VehicleSummaryCardProps) {
  return (
    <div
      className={cn(
        CHECK_IN_CARD_CLASS,
        'flex flex-col gap-4 px-4 py-3.5 md:flex-row md:items-center md:justify-between md:pr-6',
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-[60px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.3)]">
          {vehicle.avatarUrl ? (
            <img src={vehicle.avatarUrl} alt={vehicle.model} className="h-full w-full object-cover" />
          ) : (
            <Car className="h-7 w-7" />
          )}
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="truncate text-[18px] font-bold leading-tight text-slate-900">{vehicle.model}</p>
            <span className="rounded-lg bg-[#eef2f8] px-2.5 py-0.5 text-[13px] font-bold text-slate-800">
              {vehicle.licensePlate}
            </span>
          </div>
          <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600">
            <Users className="h-3.5 w-3.5" />
            {vehicle.seats} chỗ
          </p>
        </div>
      </div>

      <ol className="flex shrink-0 flex-wrap items-center gap-3" aria-label={stepsLabel}>
        {steps.map((label, index) => {
          const number = index + 1
          const isDone = number < step
          const isActive = number === step
          return (
            <Fragment key={label}>
              {index > 0 && (
                <li
                  aria-hidden="true"
                  className={cn(
                    'h-0.5 w-10 rounded-full sm:w-20',
                    isDone || isActive ? 'bg-brand-600' : 'bg-slate-200',
                  )}
                />
              )}
              <li className="flex items-center gap-2.5" aria-current={isActive ? 'step' : undefined}>
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors',
                    isDone && 'bg-brand-600 text-white shadow-[0_4px_10px_-4px_rgba(37,99,235,0.7)]',
                    isActive && 'bg-brand-600 text-white ring-4 ring-brand-100',
                    !isDone && !isActive && 'border-2 border-slate-200 bg-white text-slate-500',
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : number}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap text-[14px]',
                    isActive ? 'font-bold text-slate-900' : 'hidden font-medium text-slate-600 sm:inline',
                  )}
                >
                  {label}
                </span>
              </li>
            </Fragment>
          )
        })}
      </ol>
    </div>
  )
}
