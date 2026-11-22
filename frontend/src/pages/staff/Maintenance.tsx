import { AlertCircle, ArrowLeft, CircleCheck, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { SelectVehiclePrompt } from '@/components/inspection/SelectVehiclePrompt'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CarIllustration } from '@/components/vehicle/CarIllustration'
import { VehicleStatusBadge } from '@/components/vehicle/VehicleStatusBadge'
import { useSessionResults } from '@/hooks/useSessionResults'
import { useVehicles } from '@/hooks/useVehicles'
import { formatDateTime } from '@/lib/format'
import { getErrorMessage, isConflictError } from '@/services/apiClient'
import { vehicleService } from '@/services/vehicleService'
import type { VehicleResponse } from '@/types'
import { ConfirmActionDialog } from './check-out/ConfirmActionDialog'
import type { DashboardLocationState } from './dashboardState'
import { MaintenanceDamageList } from './maintenance/MaintenanceDamageList'
import { MaintenanceNotesCard, MaintenanceReportCard } from './maintenance/MaintenanceSidePanel'

const BACK_TO_MAINTENANCE_STATE: DashboardLocationState = { tab: 'MAINTENANCE' }

/**
 * Mockups 15–16: maintenance record of one vehicle (`/staff/maintenance/:vehicleId`). The vehicle is looked up in
 * `GET /vehicles?status=MAINTENANCE`, so a stale link (vehicle already repaired) shows a notice instead.
 */
export default function Maintenance() {
  const { vehicleId } = useParams()
  const { vehicles, isLoading, error, refetch } = useVehicles('MAINTENANCE')
  const vehicle = vehicles.find((item) => item.vehicleId === vehicleId)

  return (
    <section className="space-y-6">
      <div>
        <Button asChild variant="link" size="sm" className="h-auto px-0 text-muted-foreground">
          <Link to="/staff" state={BACK_TO_MAINTENANCE_STATE}>
            <ArrowLeft />
            Quay lại tab Bảo trì
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Hồ sơ bảo trì</h1>
      </div>

      {isLoading ? (
        <SelectVehiclePrompt isLoading loadingText="Đang tải hồ sơ bảo trì…" />
      ) : error ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="secondary" size="sm" onClick={refetch}>
            <RotateCw />
            Thử lại
          </Button>
        </Card>
      ) : !vehicle ? (
        <SelectVehiclePrompt reason="Xe này không còn ở trạng thái Bảo trì (có thể đã được sửa xong) hoặc không tồn tại." />
      ) : (
        <MaintenanceRecord key={vehicle.vehicleId} vehicle={vehicle} onStale={refetch} />
      )}
    </section>
  )
}

interface MaintenanceRecordProps {
  vehicle: VehicleResponse
  /** Reloads the maintenance list (e.g. the vehicle was released in another tab). */
  onStale: () => void
}

function MaintenanceRecord({ vehicle, onStale }: MaintenanceRecordProps) {
  const navigate = useNavigate()
  // null and undefined (field missing) both mean "no check-out data": never call /results then.
  const checkOutSessionId = vehicle.lastCheckOutSessionId ?? null
  const results = useSessionResults(checkOutSessionId)
  const [notes, setNotes] = useState(vehicle.maintenanceNotes ?? '')
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // A completed rental exists exactly when the backend could date the maintenance.
  const canSaveNotes = vehicle.maintenanceSince != null

  async function handleConfirm() {
    setIsSubmitting(true)
    try {
      const trimmed = notes.trim()
      const response = await vehicleService.completeMaintenance(vehicle.vehicleId, {
        maintenanceNotes: trimmed || undefined,
      })
      const state: DashboardLocationState = {
        maintenanceCompleted: {
          model: vehicle.model,
          licensePlate: vehicle.licensePlate,
          notesSaved: response.notesSaved ?? null,
        },
      }
      navigate('/staff', { state })
    } catch (err) {
      toast.error('Chưa đưa được xe về Sẵn sàng', { description: getErrorMessage(err) })
      setIsSubmitting(false)
      setIsConfirmOpen(false)
      if (isConflictError(err)) onStale()
    }
  }

  return (
    <>
      <VehicleHeaderCard vehicle={vehicle} />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_minmax(300px,380px)]">
        <MaintenanceDamageList hasSession={checkOutSessionId !== null} results={results} />
        <div className="space-y-6">
          {results.data && <MaintenanceReportCard session={results.data} />}
          <MaintenanceNotesCard value={notes} onChange={setNotes} disabled={isSubmitting} canSave={canSaveNotes} />
        </div>
      </div>

      <StickyActionBar
        info={
          <span>
            Sau khi sửa xong, xe sẽ trở về tab <strong className="text-emerald-700">Sẵn sàng</strong>
          </span>
        }
      >
        <Button asChild variant="secondary">
          <Link to="/staff" state={BACK_TO_MAINTENANCE_STATE}>
            Đóng
          </Link>
        </Button>
        <Button
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => setIsConfirmOpen(true)}
          disabled={isSubmitting}
        >
          <CircleCheck />
          Đã sửa xong
        </Button>
      </StickyActionBar>

      <ConfirmActionDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        tone="success"
        icon={<CircleCheck />}
        title="Xác nhận xe đã sửa xong?"
        description={
          <>
            <strong className="text-foreground">
              {vehicle.model} · {vehicle.licensePlate}
            </strong>{' '}
            sẽ chuyển về tab <strong className="text-foreground">Sẵn sàng</strong> và có thể cho thuê tiếp.
          </>
        }
        confirmLabel="Xác nhận"
        isPending={isSubmitting}
        onConfirm={() => void handleConfirm()}
      />
    </>
  )
}

function VehicleHeaderCard({ vehicle }: { vehicle: VehicleResponse }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const { avatarUrl, model, licensePlate, maintenanceSince, lastRenterName } = vehicle

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-40">
        {avatarUrl && avatarUrl !== failedUrl ? (
          <img
            src={avatarUrl}
            alt={model}
            className="h-full w-full object-cover"
            onError={() => setFailedUrl(avatarUrl)}
          />
        ) : (
          <CarIllustration seed={vehicle.vehicleId} />
        )}
      </div>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl font-semibold text-foreground">{model}</h2>
          <span className="rounded-md border bg-white px-2 py-0.5 text-sm font-semibold text-slate-800">
            {licensePlate}
          </span>
          <VehicleStatusBadge status={vehicle.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {maintenanceSince
            ? `Vào bảo trì ${formatDateTime(maintenanceSince)}${
                lastRenterName ? ` (sau lần check-out của khách ${lastRenterName})` : ''
              }`
            : 'Không có thông tin lượt thuê dẫn tới lần bảo trì này.'}
        </p>
      </div>
    </Card>
  )
}
