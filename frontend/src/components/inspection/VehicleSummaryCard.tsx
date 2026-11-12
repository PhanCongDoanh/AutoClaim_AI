import { Car, Check, User, Users } from 'lucide-react'
import { Fragment } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** Vehicle fields shown in the card; satisfied by `VehicleResponse`. */
export interface VehicleSummary {
  model: string
  licensePlate: string
  seats: number
  avatarUrl: string | null
}

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
    <Card className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
          {vehicle.avatarUrl ? (
            <img src={vehicle.avatarUrl} alt={vehicle.model} className="h-full w-full object-cover" />
          ) : (
            <Car className="h-7 w-7" />
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{vehicle.model}</p>
            <span className="rounded border bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground">
              {vehicle.licensePlate}
            </span>
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {vehicle.seats} chỗ
            </span>
            {renterName && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {renterName}
              </span>
            )}
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
                <li aria-hidden="true" className={cn('h-px w-8 sm:w-12', isDone || isActive ? 'bg-primary' : 'bg-border')} />
              )}
              <li className="flex items-center gap-2" aria-current={isActive ? 'step' : undefined}>
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    isDone && 'bg-primary text-primary-foreground',
                    isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/15',
                    !isDone && !isActive && 'border text-muted-foreground',
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : number}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap text-sm',
                    isActive ? 'font-semibold text-foreground' : 'hidden text-muted-foreground sm:inline',
                  )}
                >
                  {label}
                </span>
              </li>
            </Fragment>
          )
        })}
      </ol>
    </Card>
  )
}
