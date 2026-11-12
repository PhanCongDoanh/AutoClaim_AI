import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { VEHICLE_STATUS_VALUES, type VehicleStatus } from '@/types'
import { VEHICLE_STATUS_META } from './vehicleStatus'

interface VehicleStatusTabsProps {
  value: VehicleStatus
  onValueChange: (status: VehicleStatus) => void
  /** Optional count badge per tab. */
  counts?: Partial<Record<VehicleStatus, number>>
  /** Optional controls on the right of the filter pills (e.g. the search box). */
  toolbar?: ReactNode
  /** Panel content for a status; only the active tab is mounted. */
  children: (status: VehicleStatus) => ReactNode
}

function isVehicleStatus(value: string): value is VehicleStatus {
  return (VEHICLE_STATUS_VALUES as readonly string[]).includes(value)
}

/** Frosted panel: status filter pills (+ optional toolbar) above a white panel holding the active tab's content. */
export function VehicleStatusTabs({ value, onValueChange, counts, toolbar, children }: VehicleStatusTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => isVehicleStatus(next) && onValueChange(next)}
      className="rounded-[28px] border border-white/80 bg-white/45 p-3 shadow-[0_20px_50px_-30px_rgba(30,64,175,0.35)] backdrop-blur-md sm:p-5"
    >
      <div className="flex flex-col gap-4 px-1 pt-1 lg:flex-row lg:items-center lg:justify-between">
        <TabsList className="h-auto flex-wrap justify-start gap-3 rounded-none bg-transparent p-0">
          {VEHICLE_STATUS_VALUES.map((status) => {
            const { label, dotClass, activeTabClass, activeCountClass } = VEHICLE_STATUS_META[status]
            const count = counts?.[status]
            return (
              <TabsTrigger
                key={status}
                value={status}
                className={cn(
                  'group h-11 gap-2.5 rounded-xl border border-white bg-white/90 px-5 text-[15px] font-semibold text-slate-800 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.15)] hover:bg-white',
                  'data-[state=active]:shadow-[0_6px_16px_-8px_rgba(15,23,42,0.25)]',
                  activeTabClass,
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', dotClass)} aria-hidden="true" />
                {label}
                {count !== undefined && (
                  <span
                    className={cn(
                      'ml-1.5 min-w-7 rounded-md bg-slate-100 px-2 py-0.5 text-center text-xs font-bold text-slate-700',
                      activeCountClass,
                    )}
                  >
                    {count}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {toolbar && <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{toolbar}</div>}
      </div>

      {VEHICLE_STATUS_VALUES.map((status) => (
        <TabsContent
          key={status}
          value={status}
          className="mt-5 rounded-[22px] border border-white bg-white/95 p-4 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.18)] sm:p-5"
        >
          {children(status)}
        </TabsContent>
      ))}
    </Tabs>
  )
}
