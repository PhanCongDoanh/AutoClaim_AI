import { AlertCircle, CircleCheck, Crown, Pencil, RotateCw, Trash2, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PAGE_PRIMARY_ACTION_CLASS, PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAdminStaff } from '@/hooks/useAdminStaff'
import { useAuth } from '@/hooks/useAuth'
import { getAvatarColor, getInitials, ROLE_LABELS } from '@/lib/people'
import { cn } from '@/lib/utils'
import type { RoleName, StaffResponse } from '@/types'
import { DeleteStaffDialog } from './staff/DeleteStaffDialog'
import { StaffFormSheet } from './staff/StaffFormSheet'

interface FormState {
  open: boolean
  /** Staff member being edited, `null` when adding. Kept while closing so the title doesn't flip mid-animation. */
  staff: StaffResponse | null
}

const SKELETON_ROWS = 4

/** "0905111222" → "0905 111 222"; anything that isn't 10 digits is shown as stored. */
function formatPhone(phone: string | null): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : phone
}

/** `LocalDateTime` has no zone, so read the date part as-is instead of letting `Date` shift it. */
function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

export default function StaffManagement() {
  const { user } = useAuth()
  const { staff, isLoading, error, refetch } = useAdminStaff()
  const [formState, setFormState] = useState<FormState>({ open: false, staff: null })
  const [deleteTarget, setDeleteTarget] = useState<StaffResponse | null>(null)

  function closeForm() {
    setFormState((prev) => ({ ...prev, open: false }))
  }

  function handleSaved(saved: StaffResponse) {
    toast.success(formState.staff ? 'Đã lưu thay đổi' : 'Đã tạo tài khoản', {
      description: `${saved.fullName} · ${saved.email}`,
    })
    closeForm()
    refetch()
  }

  function handleDeleted(deleted: StaffResponse) {
    setDeleteTarget(null)
    toast.success('Đã xóa nhân viên', { description: deleted.fullName })
    refetch()
  }

  function renderBody() {
    if (isLoading) {
      return Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <TableRow key={index} className="hover:bg-transparent">
          <TableCell>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-36 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-44 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
          </TableCell>
          <TableCell>
            <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
          </TableCell>
          <TableCell>
            <div className="h-3.5 w-20 animate-pulse rounded bg-slate-100" />
          </TableCell>
          <TableCell>
            <div className="ml-auto h-8 w-32 animate-pulse rounded bg-slate-100" />
          </TableCell>
        </TableRow>
      ))
    }

    if (error && staff.length === 0) {
      return (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5}>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-muted-foreground">Không tải được danh sách nhân viên: {error}</p>
              <Button variant="secondary" size="sm" onClick={refetch}>
                <RotateCw />
                Thử lại
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )
    }

    if (staff.length === 0) {
      return (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
            Chưa có nhân viên nào. Bấm “Thêm nhân viên” để tạo tài khoản đầu tiên.
          </TableCell>
        </TableRow>
      )
    }

    return staff.map((member) => {
      const isSelf = user?.email.toLowerCase() === member.email.toLowerCase()
      return (
        <TableRow key={member.userId}>
          <TableCell>
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
                  getAvatarColor(member.roleName, member.email),
                )}
              >
                {getInitials(member.fullName)}
              </span>
              <div className="min-w-0 max-w-[15rem]">
                <p className="truncate font-medium text-foreground" title={member.fullName}>
                  {member.fullName}
                </p>
                <p className="truncate text-xs text-muted-foreground" title={member.email}>
                  {member.email}
                </p>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <RoleBadge roleName={member.roleName} />
          </TableCell>
          <TableCell className="whitespace-nowrap tabular-nums text-slate-700">{formatPhone(member.phone)}</TableCell>
          <TableCell className="whitespace-nowrap tabular-nums text-slate-700">{formatDate(member.createdAt)}</TableCell>
          <TableCell className="text-right">
            {isSelf ? (
              <span className="whitespace-nowrap text-xs text-muted-foreground">Tài khoản của bạn</span>
            ) : (
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setFormState({ open: true, staff: member })}
                  aria-label={`Sửa ${member.fullName}`}
                  title="Sửa"
                >
                  <Pencil />
                  Sửa
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setDeleteTarget(member)}
                  aria-label={`Xóa ${member.fullName}`}
                  title="Xóa"
                >
                  <Trash2 />
                  Xóa
                </Button>
              </div>
            )}
          </TableCell>
        </TableRow>
      )
    })
  }

  return (
    <section className="space-y-7">
      <PageHeader
        icon={Users}
        title="Nhân viên"
        description="Chỉ Quản trị viên mới thấy trang này. Thêm, sửa hoặc xóa tài khoản nhân viên."
        actions={
          <Button className={PAGE_PRIMARY_ACTION_CLASS} onClick={() => setFormState({ open: true, staff: null })}>
            <UserPlus />
            Thêm nhân viên
          </Button>
        }
      />

      {error && staff.length > 0 && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <p className="flex-1">Không làm mới được danh sách nhân viên: {error}</p>
          <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-100" onClick={refetch}>
            <RotateCw />
            Thử lại
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_10px_30px_-12px_rgba(15,23,42,0.12)]">
        <Table aria-busy={isLoading}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nhân viên</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{renderBody()}</TableBody>
        </Table>
      </div>

      <StaffFormSheet
        open={formState.open}
        onOpenChange={(open) => !open && closeForm()}
        staff={formState.staff}
        onSaved={handleSaved}
      />

      <DeleteStaffDialog
        staff={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </section>
  )
}

function RoleBadge({ roleName }: { roleName: RoleName | null }) {
  if (!roleName) return <span className="text-xs text-muted-foreground">—</span>
  const isAdmin = roleName === 'ADMIN'
  const Icon = isAdmin ? Crown : CircleCheck
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
        isAdmin ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700',
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {ROLE_LABELS[roleName]}
    </span>
  )
}
