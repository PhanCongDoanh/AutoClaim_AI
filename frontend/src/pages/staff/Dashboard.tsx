import { AlertCircle, Car, CircleCheck, RotateCw, Search, SearchX, X } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VehicleCard } from '@/components/vehicle/VehicleCard'
import { VehicleGridSkeleton } from '@/components/vehicle/VehicleGridSkeleton'
import { VehicleStatusTabs } from '@/components/vehicle/VehicleStatusTabs'
import { useVehicleCounts } from '@/hooks/useVehicleCounts'
import { useVehicles } from '@/hooks/useVehicles'
import { saveBlob } from '@/lib/download'
import { getErrorMessage } from '@/services/apiClient'
import { inspectionService } from '@/services/inspectionService'
import type { UUID, VehicleResponse, VehicleStatus } from '@/types'
import { RentedVehicleSheet } from './dashboard/RentedVehicleSheet'
import type { DashboardLocationState } from './dashboardState'

const EMPTY_MESSAGES: Record<VehicleStatus, string> = {
  AVAILABLE: 'Hiện không có xe nào sẵn sàng.',
  RENTED: 'Hiện không có xe nào đang cho thuê.',
  MAINTENANCE: 'Không có xe nào đang bảo trì.',
}

type VehiclesResult = ReturnType<typeof useVehicles>

/** "Danh sách xe" tab (CarListTab). */
export default function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = location.state as DashboardLocationState | null
  const checkedIn = locationState?.checkedIn
  const checkedOut = locationState?.checkedOut
  const [status, setStatus] = useState<VehicleStatus>(
    checkedOut?.vehicleStatus ?? (checkedIn ? 'RENTED' : 'AVAILABLE'),
  )
  const [search, setSearch] = useState('')
  const [showNotice, setShowNotice] = useState(Boolean(checkedIn))

  // One `useVehicles` per status (same hook / same API as before) so every filter pill can show its count.
  const available = useVehicles('AVAILABLE', search)
  const rented = useVehicles('RENTED', search)
  const maintenance = useVehicles('MAINTENANCE', search)
  const vehiclesByStatus: Record<VehicleStatus, VehiclesResult> = {
    AVAILABLE: available,
    RENTED: rented,
    MAINTENANCE: maintenance,
  }
  const counts: Partial<Record<VehicleStatus, number>> = {}
  for (const [key, result] of Object.entries(vehiclesByStatus) as [VehicleStatus, VehiclesResult][]) {
    if (!result.isLoading && !result.error) counts[key] = result.vehicles.length
  }

  return (
    <section className="space-y-7">
      <PageHeader icon={Car} title="Danh sách xe" description="Chọn xe khách muốn thuê để bắt đầu Check-in." />

      {showNotice && checkedIn && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 shadow-sm backdrop-blur"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CircleCheck className="h-4 w-4 text-emerald-600" />
          </span>
          <p className="flex-1">
            Đã check-in <strong>{checkedIn.model}</strong> ({checkedIn.licensePlate}). Xe đã chuyển
            sang Đang thuê.
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-emerald-700 hover:bg-emerald-100"
            onClick={() => setShowNotice(false)}
            aria-label="Đóng thông báo"
          >
            <X />
          </Button>
        </div>
      )}

      <VehicleStatusTabs
        value={status}
        onValueChange={setStatus}
        counts={counts}
        toolbar={
          <div className="relative w-full sm:w-[340px] xl:w-[360px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-700" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tên xe, biển số..."
              className="h-11 rounded-full border-white bg-white pl-11 pr-4 text-[14px] shadow-[0_2px_10px_-4px_rgba(15,23,42,0.18)] placeholder:text-slate-500 focus-visible:ring-brand-500/40"
              aria-label="Tìm xe"
            />
          </div>
        }
      >
        {(tabStatus) => (
          <VehicleGrid {...vehiclesByStatus[tabStatus]} search={search} emptyMessage={EMPTY_MESSAGES[tabStatus]} />
        )}
      </VehicleStatusTabs>

      <RentedVehicleSheet vehicle={selectedVehicle} onOpenChange={(open) => !open && setSelectedVehicle(null)} />
    </section>
  )
}

interface VehicleGridProps extends VehiclesResult {
  search: string
  emptyMessage: string
  selectedVehicleId?: string
  /** Rented vehicles open the details sheet (mockup 06) instead of going straight to check-out. */
  onSelectVehicle: (vehicle: VehicleResponse) => void
}

function VehicleGrid({ vehicles, isLoading, error, refetch, search, emptyMessage }: VehicleGridProps) {
  if (isLoading) return <VehicleGridSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </span>
        <p className="text-sm text-slate-600">{error}</p>
        <Button variant="secondary" size="sm" className="rounded-lg" onClick={refetch}>
          <RotateCw />
          Thử lại
        </Button>
      </div>
    )
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e9f0fd] text-brand-600">
          {search.trim() ? <SearchX className="h-6 w-6" /> : <Car className="h-6 w-6" />}
        </span>
        <p className="text-sm text-slate-600">
          {search.trim() ? `Không có xe nào khớp “${search.trim()}”.` : emptyMessage}
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {vehicles.map((vehicle) => (
        <VehicleCard
          key={vehicle.vehicleId}
          vehicle={vehicle}
          onSelect={onSelectVehicle}
          selected={vehicle.vehicleId === selectedVehicleId}
        />
      ))}
    </div>
  )
}
