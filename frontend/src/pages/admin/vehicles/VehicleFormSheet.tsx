import { Camera, Check, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { adminService } from '@/services/adminService'
import { getErrorMessage } from '@/services/apiClient'
import type { UUID, VehicleResponse } from '@/types'
import { compressImage } from '@/utils/imageCompression'
import { normalizePlate, PLATE_PATTERN } from './licensePlate'

const SEAT_OPTIONS = [4, 5, 7, 9, 16] as const
const ACCEPTED_TYPES = ['image/jpeg', 'image/png']
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
/** AdminService rejects duplicates with "Vehicle with license plate '…' already exists". */
const DUPLICATE_PLATE_MESSAGE = /already exists/i

interface VehicleFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Vehicle being edited; omit to add a new one. */
  vehicle?: VehicleResponse | null
  isPlateTaken: (plate: string, exceptVehicleId?: UUID) => boolean
  /** Called with the backend's response once POST / PUT succeeds. */
  onSaved: (vehicle: VehicleResponse) => void
}

export function VehicleFormSheet({ open, onOpenChange, vehicle, isPlateTaken, onSaved }: VehicleFormSheetProps) {
  const isEdit = Boolean(vehicle)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Sửa thông tin xe' : 'Thêm xe mới'}</SheetTitle>
          <SheetDescription>
            {vehicle
              ? `Cập nhật thông tin cho xe ${vehicle.licensePlate}.`
              : 'Xe mới xuất hiện ở tab Sẵn sàng sau khi lưu.'}
          </SheetDescription>
        </SheetHeader>
        {/* Content unmounts when the sheet closes, so the form re-initialises from `vehicle` on every open. */}
        <VehicleForm vehicle={vehicle ?? null} isPlateTaken={isPlateTaken} onSaved={onSaved} />
      </SheetContent>
    </Sheet>
  )
}

interface FormErrors {
  model?: string
  licensePlate?: string
  image?: string
}

interface VehicleFormProps {
  vehicle: VehicleResponse | null
  isPlateTaken: VehicleFormSheetProps['isPlateTaken']
  onSaved: VehicleFormSheetProps['onSaved']
}

function VehicleForm({ vehicle, isPlateTaken, onSaved }: VehicleFormProps) {
  const currentAvatarUrl = vehicle?.avatarUrl ?? null
  const [model, setModel] = useState(vehicle?.model ?? '')
  const [licensePlate, setLicensePlate] = useState(vehicle?.licensePlate ?? '')
  const [seats, setSeats] = useState(String(vehicle?.seats ?? 5))
  /** Newly picked photo; `null` keeps the current one (or none when adding). */
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const seatsId = useId()

  const ownedPreviewRef = useRef<string | null>(null)
  useEffect(() => () => {
    if (ownedPreviewRef.current) URL.revokeObjectURL(ownedPreviewRef.current)
  }, [])

  function replacePreview(url: string | null) {
    if (ownedPreviewRef.current) URL.revokeObjectURL(ownedPreviewRef.current)
    ownedPreviewRef.current = url
    setPreviewUrl(url)
  }

  async function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, image: 'Chỉ hỗ trợ ảnh JPG hoặc PNG.' }))
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setErrors((prev) => ({ ...prev, image: 'Ảnh vượt quá 5MB.' }))
      return
    }
    setErrors((prev) => ({ ...prev, image: undefined }))
    setIsCompressing(true)
    try {
      const compressed = await compressImage(file, 1280)
      setImage(compressed)
      replacePreview(URL.createObjectURL(compressed))
    } catch {
      setErrors((prev) => ({ ...prev, image: 'Không xử lý được ảnh. Vui lòng chọn ảnh khác.' }))
    } finally {
      setIsCompressing(false)
    }
  }

  function discardNewImage() {
    setImage(null)
    if (ownedPreviewRef.current) URL.revokeObjectURL(ownedPreviewRef.current)
    ownedPreviewRef.current = null
    setPreviewUrl(currentAvatarUrl)
  }

  function validate(): FormErrors {
    const next: FormErrors = {}
    const plate = normalizePlate(licensePlate)
    if (!model.trim()) next.model = 'Vui lòng nhập tên xe.'
    if (!plate) next.licensePlate = 'Vui lòng nhập biển số.'
    else if (!PLATE_PATTERN.test(plate)) next.licensePlate = 'Biển số không hợp lệ, ví dụ 43A-123.45.'
    else if (isPlateTaken(plate, vehicle?.vehicleId)) next.licensePlate = 'Biển số này đã tồn tại.'
    return next
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isCompressing || isSubmitting) return
    const nextErrors = validate()
    setErrors(nextErrors)
    if (nextErrors.model || nextErrors.licensePlate) return

    const payload = {
      model: model.trim(),
      licensePlate: normalizePlate(licensePlate),
      seats: Number(seats),
      avatar: image,
    }
    setIsSubmitting(true)
    try {
      const saved = vehicle
        ? await adminService.updateVehicle(vehicle.vehicleId, payload)
        : await adminService.createVehicle(payload)
      onSaved(saved)
    } catch (err) {
      const message = getErrorMessage(err)
      if (DUPLICATE_PLATE_MESSAGE.test(message)) {
        setErrors((prev) => ({ ...prev, licensePlate: 'Biển số này đã được dùng, kể cả cho xe đã xóa.' }))
      } else {
        toast.error(vehicle ? 'Không lưu được thay đổi' : 'Không thêm được xe', { description: message })
      }
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <SheetBody>
        <div className="space-y-2">
          <Label>Ảnh xe</Label>
          <ImageDropzone
            previewUrl={previewUrl}
            isCompressing={isCompressing}
            disabled={isSubmitting}
            onFile={handleFile}
            discardLabel={image ? (currentAvatarUrl ? 'Giữ ảnh cũ' : 'Xóa ảnh') : undefined}
            onDiscard={discardNewImage}
          />
          {errors.image && <p className="text-xs text-destructive">{errors.image}</p>}
        </div>

        <FormField label="Tên xe" required error={errors.model}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              autoFocus
              placeholder="Ví dụ: Kia Sonet Premium"
              value={model}
              onChange={(event) => {
                setModel(event.target.value)
                if (errors.model) setErrors((prev) => ({ ...prev, model: undefined }))
              }}
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Biển số" required error={errors.licensePlate}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                placeholder="43A-123.45"
                autoCapitalize="characters"
                className="font-mono uppercase placeholder:normal-case"
                value={licensePlate}
                onChange={(event) => {
                  setLicensePlate(event.target.value)
                  if (errors.licensePlate) setErrors((prev) => ({ ...prev, licensePlate: undefined }))
                }}
              />
            )}
          </FormField>

          <div className="space-y-2">
            <Label htmlFor={seatsId}>Số chỗ ngồi</Label>
            <Select value={seats} onValueChange={setSeats}>
              <SelectTrigger id={seatsId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEAT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option} chỗ
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetBody>

      <SheetFooter>
        <SheetClose asChild>
          <Button type="button" variant="secondary" disabled={isSubmitting}>
            Hủy
          </Button>
        </SheetClose>
        <Button type="submit" disabled={isCompressing || isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Check />}
          {isSubmitting ? 'Đang lưu…' : vehicle ? 'Lưu thay đổi' : 'Lưu xe'}
        </Button>
      </SheetFooter>
    </form>
  )
}

interface ImageDropzoneProps {
  previewUrl: string | null
  isCompressing: boolean
  disabled: boolean
  onFile: (file: File) => void
  /** Shown as the undo action for a newly picked photo; hidden when undefined. */
  discardLabel?: string
  onDiscard: () => void
}

function ImageDropzone({ previewUrl, isCompressing, disabled, onFile, discardLabel, onDiscard }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const isBusy = isCompressing || disabled

  function openPicker() {
    if (!isBusy) inputRef.current?.click()
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onFile(file)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file && !isBusy) onFile(file)
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex items-center gap-4 rounded-lg p-1 transition-colors',
        isDragging && 'bg-brand-50 ring-2 ring-primary/40',
      )}
    >
      <button
        type="button"
        onClick={openPicker}
        disabled={isBusy}
        aria-label={previewUrl ? 'Đổi ảnh xe' : 'Chọn ảnh xe'}
        className={cn(
          'relative flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          previewUrl ? 'border' : 'border border-dashed border-slate-300 bg-slate-50 hover:border-primary/50 hover:bg-accent',
        )}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Ảnh xe" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-5 w-5" />
        )}
        {isCompressing && (
          <span className="absolute inset-0 flex items-center justify-center bg-card/80">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </span>
        )}
      </button>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          Kéo thả hoặc{' '}
          <button type="button" onClick={openPicker} className="font-medium text-primary hover:underline">
            {previewUrl ? 'đổi ảnh' : 'chọn ảnh'}
          </button>
        </p>
        <p>JPG, PNG · tối đa 5MB</p>
        {discardLabel && !isBusy && (
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex items-center gap-1 font-medium text-destructive hover:underline"
          >
            <Trash2 className="h-3 w-3" />
            {discardLabel}
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png" hidden onChange={handleChange} />
    </div>
  )
}
