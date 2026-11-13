import { AlertCircle, CircleCheck, FileDown, RotateCw, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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

const PAGE_DESCRIPTIONS: Record<VehicleStatus, string> = {
  AVAILABLE: 'Chọn xe khách muốn thuê để bắt đầu Check-in.',
  RENTED: 'Chọn xe khách mang trả để Check-out và để AI so sánh hư hại.',
  MAINTENANCE: 'Xe phát sinh hư hại sau khi trả.',
}

const CHECKED_OUT_DESTINATION: Partial<Record<VehicleStatus, string>> = {
  AVAILABLE: 'đã về tab Sẵn sàng.',
  MAINTENANCE: 'đã chuyển sang tab Bảo trì.',
}

async function redownloadReport(sessionId: UUID, fileName: string) {
  try {
    saveBlob(await inspectionService.downloadReport(sessionId), fileName)
  } catch (err) {
    toast.error('Không tải được biên bản PDF', { description: getErrorMessage(err) })
  }
}

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
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleResponse | null>(null)
  const { counts, refetch: refetchCounts } = useVehicleCounts()

  // Mockup 10: toast once after a completed check-out, then drop the state so F5 / Back don't repeat it.
  useEffect(() => {
    if (!checkedOut) return
    const description = `${checkedOut.model} · ${checkedOut.licensePlate} ${
      CHECKED_OUT_DESTINATION[checkedOut.vehicleStatus] ?? 'đã cập nhật trạng thái.'
    }`
    const { reportFileName, sessionId } = checkedOut
    if (reportFileName) {
      // Mockup 14: report produced, vehicle moved to maintenance.
      toast('Đã xuất biên bản PDF', {
        id: `checked-out-${sessionId}`,
        icon: <FileDown className="h-4 w-4 text-red-600" />,
        description,
        duration: 10_000,
        action: { label: 'Tải lại PDF', onClick: () => void redownloadReport(sessionId, reportFileName) },
      })
    } else {
      toast.success('Trả xe hoàn tất', { id: `checked-out-${sessionId}`, description })
    }
    navigate(location.pathname, { replace: true, state: null })
  }, [checkedOut, navigate, location.pathname])

  function handleTabChange(next: VehicleStatus) {
    setStatus(next)
    refetchCounts()
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Danh sách xe</h1>
          <p className="text-sm text-muted-foreground">{PAGE_DESCRIPTIONS[status]}</p>
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

      <VehicleStatusTabs value={status} onValueChange={handleTabChange} counts={counts}>
        {(tabStatus) => (
          <VehicleGrid
            status={tabStatus}
            search={search}
            emptyMessage={EMPTY_MESSAGES[tabStatus]}
            selectedVehicleId={selectedVehicle?.vehicleId}
            onSelectVehicle={setSelectedVehicle}
          />
        )}
      </VehicleStatusTabs>

      <RentedVehicleSheet vehicle={selectedVehicle} onOpenChange={(open) => !open && setSelectedVehicle(null)} />
    </section>
  )
}

interface VehicleGridProps {
  status: VehicleStatus
  search: string
  emptyMessage: string
  selectedVehicleId?: string
  /** Rented vehicles open the details sheet (mockup 06) instead of going straight to check-out. */
  onSelectVehicle: (vehicle: VehicleResponse) => void
}

/** Radix only mounts the active tab, so each grid fetches when its tab is opened. */
function VehicleGrid({ status, search, emptyMessage, selectedVehicleId, onSelectVehicle }: VehicleGridProps) {
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
