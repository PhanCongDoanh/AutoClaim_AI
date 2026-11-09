import {
  AlertCircle,
  Camera,
  History,
  Loader2,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { VehicleCard } from '@/components/vehicle/VehicleCard'
import { VehicleGridSkeleton } from '@/components/vehicle/VehicleGridSkeleton'
import { VehicleStatusTabs } from '@/components/vehicle/VehicleStatusTabs'
import { VEHICLE_STATUS_META } from '@/components/vehicle/vehicleStatus'
import { useAdminVehicles } from '@/hooks/useAdminVehicles'
import { getErrorMessage } from '@/services/apiClient'
import { vehicleService } from '@/services/vehicleService'
import type { UUID, VehicleResponse, VehicleStatus } from '@/types'
import { DeleteVehicleDialog } from './vehicles/DeleteVehicleDialog'
import { normalizePlate } from './vehicles/licensePlate'
import { VehicleFormSheet } from './vehicles/VehicleFormSheet'

interface FormState {
  open: boolean
  /** Vehicle being edited, `null` when adding. Kept while closing so the title doesn't flip mid-animation. */
  vehicle: VehicleResponse | null
}

/** Case- and diacritic-insensitive, so "hoa" matches "Lê Thị Hòa". */
function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/gi, 'd').toLowerCase().trim()
}

function matchesSearch(vehicle: VehicleResponse, query: string): boolean {
  if (!query) return true
  return [vehicle.model, vehicle.licensePlate, vehicle.renterName ?? ''].some((field) =>
    normalizeSearch(field).includes(query),
  )
}

export default function VehicleManagement() {
  const { vehicles, isLoading, error, refetch } = useAdminVehicles()

  const [status, setStatus] = useState<VehicleStatus>('AVAILABLE')
  const [search, setSearch] = useState('')
  const [formState, setFormState] = useState<FormState>({ open: false, vehicle: null })
  const [deleteTarget, setDeleteTarget] = useState<VehicleResponse | null>(null)
  const [completingId, setCompletingId] = useState<UUID | null>(null)

  /** Instant feedback only; the backend also counts soft-deleted vehicles and has the final say. */
  const isPlateTaken = useCallback(
    (plate: string, exceptVehicleId?: UUID) => {
      const normalized = normalizePlate(plate)
      return vehicles.some(
        (vehicle) => vehicle.vehicleId !== exceptVehicleId && normalizePlate(vehicle.licensePlate) === normalized,
      )
    },
    [vehicles],
  )

  const query = normalizeSearch(search)
  const filtered = useMemo(() => vehicles.filter((vehicle) => matchesSearch(vehicle, query)), [vehicles, query])
  const counts = useMemo(() => {
    const result: Record<VehicleStatus, number> = { AVAILABLE: 0, RENTED: 0, MAINTENANCE: 0 }
    filtered.forEach((vehicle) => {
      result[vehicle.status] += 1
    })
    return result
  }, [filtered])

  function closeForm() {
    setFormState((prev) => ({ ...prev, open: false }))
  }

  function handleSaved(saved: VehicleResponse) {
    if (formState.vehicle) {
      toast.success('Đã lưu thay đổi', { description: `${saved.model} · ${saved.licensePlate}` })
    } else {
      setStatus('AVAILABLE')
      setSearch('')
      toast.success('Đã thêm xe mới', { description: `${saved.model} · ${saved.licensePlate} ở tab Sẵn sàng.` })
    }
    closeForm()
    refetch()
  }

  function handleDeleted(vehicle: VehicleResponse) {
    setDeleteTarget(null)
    toast.success('Đã xóa xe', { description: `${vehicle.model} · ${vehicle.licensePlate}` })
    refetch()
  }

  async function handleCompleteMaintenance(vehicle: VehicleResponse) {
    setCompletingId(vehicle.vehicleId)
    try {
      await vehicleService.completeMaintenance(vehicle.vehicleId)
      toast.success('Đã hoàn tất bảo trì', { description: `${vehicle.model} chuyển sang Sẵn sàng.` })
      refetch()
    } catch (err) {
      toast.error('Không cập nhật được trạng thái', { description: getErrorMessage(err) })
    } finally {
      setCompletingId(null)
    }
  }

  function renderTab(tabStatus: VehicleStatus) {
    if (isLoading) return <VehicleGridSkeleton />

    if (error && vehicles.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-muted-foreground">Không tải được danh sách xe: {error}</p>
          <Button variant="secondary" size="sm" onClick={refetch}>
            <RotateCw />
            Thử lại
          </Button>
        </div>
      )
    }

    const tabVehicles = filtered.filter((vehicle) => vehicle.status === tabStatus)
    if (tabVehicles.length === 0) {
      return (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {query
            ? `Không có xe nào khớp “${search.trim()}”.`
            : `Chưa có xe nào ở trạng thái ${VEHICLE_STATUS_META[tabStatus].label}.`}
        </p>
      )
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tabVehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.vehicleId}
            vehicle={vehicle}
            menu={
              <VehicleActionsMenu
                vehicle={vehicle}
                onEdit={() => setFormState({ open: true, vehicle })}
                onDelete={() => setDeleteTarget(vehicle)}
              />
            }
            actions={
              <AdminCardAction
                vehicle={vehicle}
                isCompleting={completingId === vehicle.vehicleId}
                onCompleteMaintenance={handleCompleteMaintenance}
              />
            }
          />
        ))}
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Quản lý xe</h1>
          <p className="text-sm text-muted-foreground">Chọn xe khách muốn thuê để bắt đầu Check-in.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tên xe, biển số, tên khách..."
              className="pl-9"
              aria-label="Tìm xe"
            />
          </div>
          <Button onClick={() => setFormState({ open: true, vehicle: null })}>
            <Plus />
            Thêm xe
          </Button>
        </div>
      </div>

      {error && vehicles.length > 0 && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <p className="flex-1">Không làm mới được danh sách xe: {error}</p>
          <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-100" onClick={refetch}>
            <RotateCw />
            Thử lại
          </Button>
        </div>
      )}

      <VehicleStatusTabs value={status} onValueChange={setStatus} counts={isLoading ? undefined : counts}>
        {renderTab}
      </VehicleStatusTabs>

      <VehicleFormSheet
        open={formState.open}
        onOpenChange={(open) => !open && closeForm()}
        vehicle={formState.vehicle}
        isPlateTaken={isPlateTaken}
        onSaved={handleSaved}
      />

      <DeleteVehicleDialog
        vehicle={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </section>
  )
}

interface VehicleActionsMenuProps {
  vehicle: VehicleResponse
  onEdit: () => void
  onDelete: () => void
}

function VehicleActionsMenu({ vehicle, onEdit, onDelete }: VehicleActionsMenuProps) {
  return (
    // Non-modal so opening the Sheet/AlertDialog from an item doesn't fight over focus and pointer events.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-card/95 shadow-sm"
          aria-label={`Thao tác cho ${vehicle.model}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          Sửa thông tin xe
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <History />
          Lịch sử kiểm định
          <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Sắp có
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          Xóa phương tiện
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface AdminCardActionProps {
  vehicle: VehicleResponse
  isCompleting: boolean
  onCompleteMaintenance: (vehicle: VehicleResponse) => void
}

function AdminCardAction({ vehicle, isCompleting, onCompleteMaintenance }: AdminCardActionProps) {
  if (vehicle.status === 'MAINTENANCE') {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={isCompleting}
        onClick={() => onCompleteMaintenance(vehicle)}
      >
        {isCompleting ? <Loader2 className="animate-spin" /> : <Wrench />}
        Hoàn tất bảo trì
      </Button>
    )
  }

  // Check-in/out runs on /staff routes, which ProtectedRoute limits to STAFF accounts.
  const isAvailable = vehicle.status === 'AVAILABLE'
  return (
    <Button
      variant="secondary"
      size="sm"
      className="w-full"
      disabled
      title="Chỉ tài khoản Nhân viên thực hiện check-in / check-out"
    >
      {isAvailable ? <Camera /> : <LogOut />}
      {isAvailable ? 'Chọn xe · Check-in' : 'Check-out'}
    </Button>
  )
}
