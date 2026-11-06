import {
  AlertCircle,
  Car,
  CircleCheck,
  KeyRound,
  RotateCw,
  Search,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VehicleCard } from '@/components/vehicle/VehicleCard'
import { useVehicles } from '@/hooks/useVehicles'
import { VEHICLE_STATUS_VALUES, type VehicleStatus } from '@/types'
import type { DashboardLocationState } from './dashboardState'

const STATUS_TABS: Record<VehicleStatus, { label: string; icon: LucideIcon; empty: string }> = {
  AVAILABLE: { label: 'Available', icon: Car, empty: 'No vehicles are available right now.' },
  RENTED: { label: 'Rented', icon: KeyRound, empty: 'No vehicles are currently rented.' },
  MAINTENANCE: { label: 'Maintenance', icon: Wrench, empty: 'No vehicles are in maintenance.' },
}

function isVehicleStatus(value: string): value is VehicleStatus {
  return (VEHICLE_STATUS_VALUES as readonly string[]).includes(value)
}

export default function Dashboard() {
  const location = useLocation()
  const checkedIn = (location.state as DashboardLocationState | null)?.checkedIn
  const [status, setStatus] = useState<VehicleStatus>(checkedIn ? 'RENTED' : 'AVAILABLE')
  const [search, setSearch] = useState('')
  const [showNotice, setShowNotice] = useState(Boolean(checkedIn))

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Staff Dashboard</h1>
        <p className="text-sm text-muted-foreground">Fleet overview and today&apos;s inspections.</p>
      </div>

      {showNotice && checkedIn && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <p className="flex-1">
            Đã check-in <strong>{checkedIn.model}</strong> ({checkedIn.licensePlate}). Xe đã chuyển
            sang Đang thuê.
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-emerald-700 hover:bg-emerald-100"
            onClick={() => setShowNotice(false)}
            aria-label="Đóng thông báo"
          >
            <X />
          </Button>
        </div>
      )}

      <Tabs value={status} onValueChange={(value) => isVehicleStatus(value) && setStatus(value)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            {VEHICLE_STATUS_VALUES.map((value) => {
              const { label, icon: Icon } = STATUS_TABS[value]
              return (
                <TabsTrigger key={value} value={value}>
                  <Icon />
                  {label}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search model or license plate"
              className="pl-9"
              aria-label="Search vehicles"
            />
          </div>
        </div>

        {VEHICLE_STATUS_VALUES.map((value) => (
          <TabsContent key={value} value={value}>
            <VehicleGrid status={value} search={search} emptyMessage={STATUS_TABS[value].empty} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}

interface VehicleGridProps {
  status: VehicleStatus
  search: string
  emptyMessage: string
}

/** Radix only mounts the active tab, so each grid fetches when its tab is opened. */
function VehicleGrid({ status, search, emptyMessage }: VehicleGridProps) {
  const { vehicles, isLoading, error, refetch } = useVehicles(status, search)

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="aspect-video animate-pulse bg-muted" />
            <div className="space-y-2 p-5">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="secondary" size="sm" onClick={refetch}>
          <RotateCw />
          Try again
        </Button>
      </Card>
    )
  }

  if (vehicles.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        {search.trim() ? `No vehicles match “${search.trim()}”.` : emptyMessage}
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {vehicles.map((vehicle) => (
        <VehicleCard key={vehicle.vehicleId} vehicle={vehicle} />
      ))}
    </div>
  )
}
