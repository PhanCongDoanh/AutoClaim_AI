import { Loader2, Trash2, X } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { adminService } from '@/services/adminService'
import { getErrorMessage } from '@/services/apiClient'
import type { VehicleResponse } from '@/types'

interface DeleteVehicleDialogProps {
  vehicle: VehicleResponse | null
  onOpenChange: (open: boolean) => void
  /** Called once `DELETE /api/admin/vehicles/{id}` succeeds. */
  onDeleted: (vehicle: VehicleResponse) => void
}

export function DeleteVehicleDialog({ vehicle, onOpenChange, onDeleted }: DeleteVehicleDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  return (
    <AlertDialog open={Boolean(vehicle)} onOpenChange={(open) => !isDeleting && onOpenChange(open)}>
      <AlertDialogContent>
        {/* Remounts per open, so the confirmation input always starts empty. */}
        {vehicle && (
          <DeleteVehicleForm
            vehicle={vehicle}
            isDeleting={isDeleting}
            onDeletingChange={setIsDeleting}
            onDeleted={onDeleted}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface DeleteVehicleFormProps {
  vehicle: VehicleResponse
  isDeleting: boolean
  onDeletingChange: (isDeleting: boolean) => void
  onDeleted: DeleteVehicleDialogProps['onDeleted']
}

function DeleteVehicleForm({ vehicle, isDeleting, onDeletingChange, onDeleted }: DeleteVehicleFormProps) {
  const [confirmation, setConfirmation] = useState('')
  const inputId = useId()
  const hintId = useId()

  const isRented = vehicle.status === 'RENTED'
  const isMatch = confirmation.trim() === vehicle.licensePlate
  const canDelete = isMatch && !isRented && !isDeleting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canDelete) return
    onDeletingChange(true)
    try {
      await adminService.deleteVehicle(vehicle.vehicleId)
      onDeletingChange(false)
      onDeleted(vehicle)
    } catch (err) {
      onDeletingChange(false)
      toast.error('Không xóa được xe', { description: getErrorMessage(err) })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-4 p-5 pr-12">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
          <Trash2 className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <AlertDialogTitle>Xóa xe khỏi hệ thống?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="font-semibold text-foreground">
              {vehicle.model} · {vehicle.licensePlate}
            </strong>{' '}
            sẽ biến mất khỏi các tab. Lịch sử check-in / check-out cũ vẫn được giữ lại.
          </AlertDialogDescription>
        </div>
      </div>

      <AlertDialogCancel
        disabled={isDeleting}
        aria-label="Đóng"
        className="absolute right-3 top-3 h-8 w-8 border-0 p-0 text-muted-foreground shadow-none"
      >
        <X className="h-4 w-4" />
      </AlertDialogCancel>

      <div className="space-y-2 px-5 pb-5">
        <Label htmlFor={inputId} className="font-normal">
          Nhập biển số <strong className="font-semibold">{vehicle.licensePlate}</strong> để xác nhận
        </Label>
        <Input
          id={inputId}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          placeholder={vehicle.licensePlate}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          aria-describedby={hintId}
          disabled={isRented || isDeleting}
          className="font-mono focus-visible:ring-destructive"
        />
        <p id={hintId} className={cn('text-xs', isRented ? 'font-medium text-destructive' : 'text-muted-foreground')}>
          {isRented
            ? 'Xe đang cho thuê. Hãy check-out trước khi xóa.'
            : 'Không thể xóa xe đang cho thuê.'}
        </p>
      </div>

      <div className="flex justify-end gap-2 border-t px-5 py-4">
        <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
        <Button type="submit" variant="destructive" disabled={!canDelete}>
          {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
          {isDeleting ? 'Đang xóa…' : 'Xóa xe'}
        </Button>
      </div>
    </form>
  )
}
