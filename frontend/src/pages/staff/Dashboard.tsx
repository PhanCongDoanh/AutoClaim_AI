import { AlertCircle, Car, CircleCheck, FileDown, RotateCw, Search, SearchX, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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

const PAGE_DESCRIPTIONS: Record<VehicleStatus, string> = {
  AVAILABLE: 'Chọn xe khách muốn thuê để bắt đầu Check-in.',
  RENTED: 'Chọn xe khách mang trả để Check-out và để AI so sánh hư hại.',
  MAINTENANCE: 'Xe phát sinh hư hại sau khi trả. Bấm “Đã sửa xong” để đưa xe về Sẵn sàng.',
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

function getInitialStatus(state: DashboardLocationState | null): VehicleStatus {
  if (state?.checkedOut) return state.checkedOut.vehicleStatus
  if (state?.maintenanceCompleted) return 'AVAILABLE'
  if (state?.checkedIn) return 'RENTED'
  return state?.tab ?? 'AVAILABLE'
}

/** "Danh sách xe" tab (CarListTab). */
export default function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = location.state as DashboardLocationState | null
  const checkedIn = locationState?.checkedIn
  const checkedOut = locationState?.checkedOut
  const maintenanceCompleted = locationState?.maintenanceCompleted
  const [status, setStatus] = useState<VehicleStatus>(() => getInitialStatus(locationState))
  const [search, setSearch] = useState('')
  const [showNotice, setShowNotice] = useState(Boolean(checkedIn))
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleResponse | null>(null)
  const { counts, refetch: refetchCounts } = useVehicleCounts()

  // Mockups 10 / 14: toast once after a completed check-out, then drop the state so F5 / Back don't repeat it.
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

  // Mockup 17: toast once after "Đã sửa xong", then drop the state.
  useEffect(() => {
    if (!maintenanceCompleted) return
    const { model, licensePlate, notesSaved } = maintenanceCompleted
    const id = `maintenance-done-${licensePlate}`
    if (notesSaved === false) {
      toast.success('Đã đưa xe về Sẵn sàng (không có lượt thuê để lưu ghi chú)', {
        id,
        description: `${model} · ${licensePlate}`,
      })
    } else {
      toast.success('Xe đã sẵn sàng cho thuê', { id, description: `${model} · ${licensePlate} đã về tab Sẵn sàng.` })
    }
    navigate(location.pathname, { replace: true, state: null })
  }, [maintenanceCompleted, navigate, location.pathname])

  function handleTabChange(next: VehicleStatus) {
    setStatus(next)
    refetchCounts()
  }

  return (
    <section className="space-y-7">
      <PageHeader icon={Car} title="Danh sách xe" description={PAGE_DESCRIPTIONS[status]} />

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
        onValueChange={handleTabChange}
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
