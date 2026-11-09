import { AlertCircle, CircleCheck, RotateCw, Search, X } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VehicleCard } from '@/components/vehicle/VehicleCard'
import { VehicleGridSkeleton } from '@/components/vehicle/VehicleGridSkeleton'
import { VehicleStatusTabs } from '@/components/vehicle/VehicleStatusTabs'
import { useVehicles } from '@/hooks/useVehicles'
import type { VehicleStatus } from '@/types'
import type { DashboardLocationState } from './dashboardState'

const EMPTY_MESSAGES: Record<VehicleStatus, string> = {
  AVAILABLE: 'Hiện không có xe nào sẵn sàng.',
  RENTED: 'Hiện không có xe nào đang cho thuê.',
  MAINTENANCE: 'Không có xe nào đang bảo trì.',
}

export default function Dashboard() {
  const location = useLocation()
  const checkedIn = (location.state as DashboardLocationState | null)?.checkedIn
  const [status, setStatus] = useState<VehicleStatus>(checkedIn ? 'RENTED' : 'AVAILABLE')
  const [search, setSearch] = useState('')
  const [showNotice, setShowNotice] = useState(Boolean(checkedIn))

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Danh sách xe</h1>
          <p className="text-sm text-muted-foreground">Chọn xe khách muốn thuê để bắt đầu Check-in.</p>
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm tên xe, biển số..."
            className="pl-9"
            aria-label="Tìm xe"
          />
        </div>
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

      <VehicleStatusTabs value={status} onValueChange={setStatus}>
        {(tabStatus) => (
          <VehicleGrid status={tabStatus} search={search} emptyMessage={EMPTY_MESSAGES[tabStatus]} />
        )}
      </VehicleStatusTabs>
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

  if (isLoading) return <VehicleGridSkeleton />


  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="secondary" size="sm" onClick={refetch}>
          <RotateCw />
          Thử lại
        </Button>
      </div>
    )
  }

  if (vehicles.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {search.trim() ? `Không có xe nào khớp “${search.trim()}”.` : emptyMessage}
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {vehicles.map((vehicle) => (
        <VehicleCard key={vehicle.vehicleId} vehicle={vehicle} />
      ))}
    </div>
  )
}
