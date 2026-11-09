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
  /** Panel content for a status; only the active tab is mounted. */
  children: (status: VehicleStatus) => ReactNode
}

function isVehicleStatus(value: string): value is VehicleStatus {
  return (VEHICLE_STATUS_VALUES as readonly string[]).includes(value)
}

/** Folder-style status tabs attached to a white panel. */
export function VehicleStatusTabs({ value, onValueChange, counts, children }: VehicleStatusTabsProps) {
  return (
    <Tabs value={value} onValueChange={(next) => isVehicleStatus(next) && onValueChange(next)}>
      <TabsList className="relative z-10 h-auto gap-1 rounded-none bg-transparent p-0">
        {VEHICLE_STATUS_VALUES.map((status) => {
          const { label, dotClass } = VEHICLE_STATUS_META[status]
          const count = counts?.[status]
          return (
            <TabsTrigger
              key={status}
              value={status}
              className={cn(
                '-mb-px gap-2 rounded-b-none rounded-t-lg border border-transparent px-4 py-2.5 text-muted-foreground',
                'data-[state=active]:border-border data-[state=active]:border-b-card data-[state=active]:bg-card data-[state=active]:text-emerald-700 data-[state=active]:shadow-none',
                status === 'RENTED' && 'data-[state=active]:text-amber-700',
                status === 'MAINTENANCE' && 'data-[state=active]:text-red-700',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', dotClass)} aria-hidden="true" />
              {label}
              {count !== undefined && (
                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {count}
                </span>
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>

      {VEHICLE_STATUS_VALUES.map((status) => (
        <TabsContent
          key={status}
          value={status}
          className="mt-0 rounded-b-xl rounded-tr-xl border bg-card p-4 sm:p-5"
        >
          {children(status)}
        </TabsContent>
      ))}
    </Tabs>
  )
}
