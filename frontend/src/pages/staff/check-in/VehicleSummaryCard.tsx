import { Car, Check, Users } from 'lucide-react'
import { Fragment } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { VehicleResponse } from '@/types'

const STEPS = ['Thông tin khách & CCCD', 'Chụp 8 góc xe'] as const

interface VehicleSummaryCardProps {
  vehicle: VehicleResponse
  /** 1-based active step. */
  step: 1 | 2
}

export function VehicleSummaryCard({ vehicle, step }: VehicleSummaryCardProps) {
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
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{vehicle.model}</p>
            <span className="rounded border bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground">
              {vehicle.licensePlate}
            </span>
          </div>
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {vehicle.seats} chỗ
          </p>
        </div>
      </div>

      <ol className="flex shrink-0 items-center gap-3" aria-label="Các bước check-in">
        {STEPS.map((label, index) => {
          const number = index + 1
          const isDone = number < step
          const isActive = number === step
          return (
            <Fragment key={label}>
              {index > 0 && (
                <li aria-hidden="true" className={cn('h-px w-10 sm:w-16', isDone || isActive ? 'bg-primary' : 'bg-border')} />
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
