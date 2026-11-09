import { Loader2, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { adminService } from '@/services/adminService'
import { getErrorMessage } from '@/services/apiClient'
import type { StaffResponse } from '@/types'

interface DeleteStaffDialogProps {
  staff: StaffResponse | null
  onOpenChange: (open: boolean) => void
  /** Called once `DELETE /api/admin/staff/{id}` succeeds. */
  onDeleted: (staff: StaffResponse) => void
}

export function DeleteStaffDialog({ staff, onOpenChange, onDeleted }: DeleteStaffDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!staff || isDeleting) return
    setIsDeleting(true)
    try {
      await adminService.deleteStaff(staff.userId)
      setIsDeleting(false)
      onDeleted(staff)
    } catch (err) {
      setIsDeleting(false)
      toast.error('Không xóa được nhân viên', { description: getErrorMessage(err) })
    }
  }

  return (
    <AlertDialog open={Boolean(staff)} onOpenChange={(open) => !isDeleting && onOpenChange(open)}>
      <AlertDialogContent>
        {staff && (
          <>
            <div className="flex gap-4 p-5 pr-12">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <AlertDialogTitle>Xóa nhân viên {staff.fullName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tài khoản sẽ không thể đăng nhập nữa. Các phiên check-in / check-out do nhân viên này thực hiện vẫn
                  được giữ lại.
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

            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
              {/* Plain Button, not AlertDialogAction: the dialog must stay open until DELETE resolves. */}
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                {isDeleting ? 'Đang xóa…' : 'Xóa nhân viên'}
              </Button>
            </div>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
