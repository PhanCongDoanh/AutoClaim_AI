import {
  Check,
  Circle,
  CircleCheck,
  CircleX,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { evaluatePassword, generateStrongPassword, PASSWORD_MAX_LENGTH } from '@/lib/passwordPolicy'
import { cn } from '@/lib/utils'
import { adminService } from '@/services/adminService'
import { getErrorMessage, getFieldErrors } from '@/services/apiClient'
import type { RoleName, StaffResponse } from '@/types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Vietnamese mobile/landline: 10 digits starting with 0, spaces allowed while typing. */
const PHONE_PATTERN = /^0\d{9}$/
/** AdminService rejects duplicates with "User with email '…' already exists". */
const DUPLICATE_EMAIL_MESSAGE = /already exists/i

const ROLE_OPTIONS: ReadonlyArray<{ value: RoleName; label: string; description: string; icon: LucideIcon; iconClass: string }> = [
  { value: 'STAFF', label: 'Nhân viên', description: 'Check-in, check-out, bảo trì', icon: CircleCheck, iconClass: 'text-brand-600' },
  {
    value: 'ADMIN',
    label: 'Quản trị viên',
    description: 'Toàn quyền, gồm quản lý xe & nhân viên',
    icon: Crown,
    iconClass: 'text-violet-600',
  },
]

interface StaffFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Staff member being edited; omit to add a new one. */
  staff?: StaffResponse | null
  /** Called with the backend's response once POST / PUT succeeds. */
  onSaved: (staff: StaffResponse) => void
}

export function StaffFormSheet({ open, onOpenChange, staff, onSaved }: StaffFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{staff ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên'}</SheetTitle>
          <SheetDescription>
            {staff
              ? 'Email đăng nhập và mật khẩu không đổi được ở đây.'
              : 'Nhân viên đăng nhập bằng email và mật khẩu dưới đây.'}
          </SheetDescription>
        </SheetHeader>
        {/* Content unmounts when the sheet closes, so the form re-initialises from `staff` on every open. */}
        <StaffForm staff={staff ?? null} onSaved={onSaved} />
      </SheetContent>
    </Sheet>
  )
}

interface FormErrors {
  fullName?: string
  email?: string
  phone?: string
  password?: string
}

function StaffForm({ staff, onSaved }: { staff: StaffResponse | null; onSaved: StaffFormSheetProps['onSaved'] }) {
  const isEdit = staff !== null
  const [fullName, setFullName] = useState(staff?.fullName ?? '')
  const [email, setEmail] = useState(staff?.email ?? '')
  const [phone, setPhone] = useState(staff?.phone ?? '')
  const [password, setPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [roleName, setRoleName] = useState<RoleName>(staff?.roleName ?? 'STAFF')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordEvaluation = evaluatePassword(password, email, fullName)
  const showPasswordChecklistErrors = passwordTouched || password.length > 0

  function clearError(field: keyof FormErrors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function syncPasswordError(nextPassword: string, nextEmail: string, nextFullName: string, forceCheck = false) {
    if (isEdit) return
    if (!forceCheck && !passwordTouched && !errors.password) return
    const evaluation = evaluatePassword(nextPassword, nextEmail, nextFullName)
    setErrors((prev) => ({ ...prev, password: evaluation.firstError ?? undefined }))
  }

  function handleGeneratePassword() {
    const generated = generateStrongPassword(email, fullName)
    setPassword(generated)
    setShowPassword(true)
    setPasswordTouched(true)
    setErrors((prev) => ({ ...prev, password: undefined }))
  }

  function validate(): FormErrors {
    const next: FormErrors = {}
    const normalizedPhone = phone.replace(/\s+/g, '')
    if (!fullName.trim()) next.fullName = 'Vui lòng nhập họ và tên.'
    if (!isEdit) {
      if (!email.trim()) next.email = 'Vui lòng nhập email.'
      else if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Email không hợp lệ.'
      if (!passwordEvaluation.isValid) {
        next.password = passwordEvaluation.firstError ?? 'Mật khẩu chưa đạt yêu cầu bảo mật.'
      }
    }
    if (normalizedPhone && !PHONE_PATTERN.test(normalizedPhone)) {
      next.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.'
    }
    return next
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    if (!isEdit) setPasswordTouched(true)

    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    const normalizedPhone = phone.replace(/\s+/g, '') || undefined
    setIsSubmitting(true)
    try {
      const saved = staff
        ? await adminService.updateStaff(staff.userId, { fullName: fullName.trim(), phone: normalizedPhone, roleName })
        : await adminService.createStaff({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: normalizedPhone,
            password,
            roleName,
          })
      onSaved(saved)
    } catch (err) {
      const message = getErrorMessage(err)
      const fieldErrors = getFieldErrors(err)
      if (DUPLICATE_EMAIL_MESSAGE.test(message)) {
        setErrors((prev) => ({ ...prev, email: 'Email này đã được dùng cho một tài khoản khác.' }))
      } else if (Object.keys(fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }))
      } else {
        toast.error(staff ? 'Không lưu được thay đổi' : 'Không tạo được tài khoản', { description: message })
      }
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <SheetBody>
        <FormField label="Họ và tên" required error={errors.fullName}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              autoFocus
              autoComplete="off"
              placeholder="Ví dụ: Nguyễn Văn An"
              value={fullName}
              onChange={(event) => {
                const value = event.target.value
                setFullName(value)
                clearError('fullName')
                syncPasswordError(password, email, value)
              }}
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Email đăng nhập"
            required={!isEdit}
            error={errors.email}
            hint={isEdit ? 'Không thể đổi email.' : undefined}
            icon={<Mail />}
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="email"
                autoComplete="off"
                placeholder="ten@autoclaim.vn"
                className="pl-9"
                disabled={isEdit}
                value={email}
                onChange={(event) => {
                  const value = event.target.value
                  setEmail(value)
                  clearError('email')
                  syncPasswordError(password, value, fullName)
                }}
              />
            )}
          </FormField>

          <FormField label="Số điện thoại" error={errors.phone} icon={<Phone />}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="0912 345 678"
                className="pl-9"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value)
                  clearError('phone')
                }}
              />
            )}
          </FormField>
        </div>

        {!isEdit && (
          <div className="space-y-2.5">
            <div className="relative">
              <FormField label="Mật khẩu" required error={errors.password} icon={<KeyRound />}>
                {(fieldProps) => (
                  <>
                    <Input
                      {...fieldProps}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      maxLength={PASSWORD_MAX_LENGTH + 4}
                      placeholder="Nhập 6–12 ký tự"
                      className="pl-9 pr-10"
                      value={password}
                      onChange={(event) => {
                        const value = event.target.value
                        setPassword(value)
                        syncPasswordError(value, email, fullName, true)
                      }}
                      onBlur={() => {
                        setPasswordTouched(true)
                        syncPasswordError(password, email, fullName, true)
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((shown) => !shown)}
                      className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </>
                )}
              </FormField>

              <button
                type="button"
                onClick={handleGeneratePassword}
                className="absolute right-0 top-0 inline-flex items-center gap-1 rounded text-xs font-medium text-brand-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Tạo mật khẩu mạnh
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
              <p className="mb-2 text-xs font-medium text-slate-600">Yêu cầu mật khẩu:</p>
              <ul className="grid gap-1.5 text-xs sm:grid-cols-2" aria-label="Tiêu chí mật khẩu">
                {passwordEvaluation.rules.map((rule) => {
                  const Icon = rule.passed ? CircleCheck : showPasswordChecklistErrors ? CircleX : Circle
                  return (
                    <li
                      key={rule.id}
                      className={cn(
                        'flex items-start gap-1.5 leading-snug',
                        rule.passed
                          ? 'text-emerald-700'
                          : showPasswordChecklistErrors
                            ? 'text-red-600'
                            : 'text-slate-500',
                      )}
                    >
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{rule.label}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium leading-none">
            Vai trò<span className="ml-0.5 text-muted-foreground">*</span>
          </legend>
          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            {ROLE_OPTIONS.map(({ value, label, description, icon: Icon, iconClass }) => (
              <label
                key={value}
                className={cn(
                  'relative flex cursor-pointer flex-col gap-1 rounded-lg border p-3 pr-9 transition-colors',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  roleName === value ? 'border-primary bg-brand-50/60 ring-1 ring-primary' : 'hover:bg-accent',
                )}
              >
                <input
                  type="radio"
                  name="roleName"
                  value={value}
                  checked={roleName === value}
                  onChange={() => setRoleName(value)}
                  className="peer sr-only"
                />
                <Icon className={cn('h-4 w-4', iconClass)} aria-hidden="true" />
                <span className="text-sm font-semibold text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute right-3 top-3 h-4 w-4 rounded-full border',
                    roleName === value ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_white]' : 'border-slate-300',
                  )}
                />
              </label>
            ))}
          </div>
        </fieldset>
      </SheetBody>

      <SheetFooter>
        <SheetClose asChild>
          <Button type="button" variant="secondary" disabled={isSubmitting}>
            Hủy
          </Button>
        </SheetClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Check />}
          {isSubmitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
        </Button>
      </SheetFooter>
    </form>
  )
}
