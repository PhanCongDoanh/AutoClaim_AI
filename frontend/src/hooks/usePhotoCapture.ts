import { useCallback, useEffect, useRef, useState } from 'react'
import type { AngleCode, SlotValidationResult, SlotValidationStatus } from '@/types'
import { compressImage } from '@/utils/imageCompression'
import { inspectionService } from '@/services/inspectionService'
import { ANGLE_LABELS } from '@/components/inspection/photoAngles'

const MAX_DIMENSION_PX = 1280

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

async function computeFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface CapturedPhoto {
  /** Compressed file, renamed to `<ANGLE_CODE>.<ext>`. */
  file: File
  previewUrl: string
  capturedAt: Date
  sha256?: string
}

export interface PhotoSlot {
  /** Last successfully processed photo; kept while a retake is being processed. */
  photo: CapturedPhoto | null
  isCompressing: boolean
  status: SlotValidationStatus
  validationResult: SlotValidationResult | null
  error: string | null
}

export const EMPTY_PHOTO_SLOT: PhotoSlot = {
  photo: null,
  isCompressing: false,
  status: 'EMPTY',
  validationResult: null,
  error: null,
}

export function isSlotReady(slot: PhotoSlot | undefined, isIdCard = false): boolean {
  if (!slot?.photo || slot.isCompressing) return false
  if (isIdCard) {
    return Boolean(slot.photo) && !slot.isCompressing && !slot.error && slot.status === 'VALID'
  }
  // Strict FAIL-CLOSED: Vehicle angles MUST have status 'VALID'
  return slot.status === 'VALID'
}

export interface CaptureContext {
  vehicleId?: string
  bookingId?: string
  sessionType?: 'CHECK_IN' | 'CHECK_OUT'
}

/** Compresses captured photos per angle, calls AI pre-validation, and owns preview object URLs. */
export function usePhotoCapture() {
  const [slots, setSlots] = useState<Partial<Record<AngleCode, PhotoSlot>>>({})
  const slotsRef = useRef(slots)
  useEffect(() => {
    slotsRef.current = slots
  }, [slots])

  const previewUrlsRef = useRef(new Map<AngleCode, string>())
  const latestRequestRef = useRef(new Map<AngleCode, number>())
  const abortControllersRef = useRef(new Map<AngleCode, AbortController>())

  useEffect(() => {
    const previewUrls = previewUrlsRef.current
    const controllers = abortControllersRef.current
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      previewUrls.clear()
      controllers.forEach((ctrl) => ctrl.abort())
      controllers.clear()
    }
  }, [])

  const updateSlot = useCallback((key: AngleCode, patch: Partial<PhotoSlot>) => {
    setSlots((prev) => ({ ...prev, [key]: { ...EMPTY_PHOTO_SLOT, ...prev[key], ...patch } }))
  }, [])

  const capture = useCallback(
    async (key: AngleCode, file: File, context?: CaptureContext) => {
      // Abort any ongoing validation for this slot
      const existingCtrl = abortControllersRef.current.get(key)
      if (existingCtrl) {
        existingCtrl.abort()
      }
      const abortController = new AbortController()
      abortControllersRef.current.set(key, abortController)

      const requestId = (latestRequestRef.current.get(key) ?? 0) + 1
      latestRequestRef.current.set(key, requestId)

      // Start compression & validation
      updateSlot(key, {
        isCompressing: true,
        status: 'VALIDATING',
        error: null,
        validationResult: null,
      })

      try {
        const compressed = await compressImage(file, MAX_DIMENSION_PX)
        if (latestRequestRef.current.get(key) !== requestId) return

        const extension = EXTENSION_BY_TYPE[compressed.type] ?? 'jpg'
        const renamed = new File([compressed], `${key}.${extension}`, { type: compressed.type })
        const previewUrl = URL.createObjectURL(renamed)
        const sha256 = await computeFileSha256(renamed)

        const previousUrl = previewUrlsRef.current.get(key)
        if (previousUrl) URL.revokeObjectURL(previousUrl)
        previewUrlsRef.current.set(key, previewUrl)

        const photoObj: CapturedPhoto = { file: renamed, previewUrl, capturedAt: new Date(), sha256 }

        // CCCD cards validation
        if (key === 'CCCD_FRONT' || key === 'CCCD_BACK') {
          const otherIdKey: AngleCode = key === 'CCCD_FRONT' ? 'CCCD_BACK' : 'CCCD_FRONT'
          const otherSlot = slotsRef.current[otherIdKey]
          if (otherSlot?.photo?.sha256 && otherSlot.photo.sha256 === sha256) {
            updateSlot(key, {
              photo: photoObj,
              isCompressing: false,
              status: 'INVALID',
              error: 'Ảnh CCCD mặt sau bị trùng lặp với mặt trước. Vui lòng chụp rõ hai mặt thẻ riêng biệt.',
              validationResult: null,
            })
            return
          }

          updateSlot(key, {
            photo: photoObj,
            isCompressing: false,
            status: 'VALID',
            error: null,
            validationResult: null,
          })
          return
        }

        // Vehicle angles: Check client-side duplicate across all other slots that are VALID
        const duplicateEntry = Object.entries(slotsRef.current).find(
          ([k, s]) => k !== key && s?.status === 'VALID' && s?.photo?.sha256 && s.photo.sha256 === sha256,
        )
        if (duplicateEntry) {
          const dupKey = duplicateEntry[0] as AngleCode
          const dupName = ANGLE_LABELS[dupKey] || dupKey
          updateSlot(key, {
            photo: photoObj,
            isCompressing: false,
            status: 'INVALID',
            error: `Ảnh này đã được sử dụng tại ${dupName}. Vui lòng chụp ảnh khác.`,
            validationResult: null,
          })
          return
        }

        // Vehicle angles (ANGLE_1..ANGLE_8): Call backend pre-validation API
        updateSlot(key, {
          photo: photoObj,
          isCompressing: false,
          status: 'VALIDATING',
          error: null,
        })

        const clientHashes = Object.entries(slotsRef.current)
          .filter(([k, s]) => k !== key && s?.status === 'VALID' && (s?.photo?.sha256 || s?.validationResult?.imageHash))
          .map(([, s]) => s!.photo?.sha256 || s!.validationResult!.imageHash!)

        try {
          const result = await inspectionService.validateSlot(
            {
              vehicleId: context?.vehicleId,
              bookingId: context?.bookingId,
              angleCode: key,
              sessionType: context?.sessionType || 'CHECK_IN',
              image: renamed,
              clientHashes,
            },
            abortController.signal,
          )

          if (latestRequestRef.current.get(key) !== requestId) return

          if (result.valid) {
            updateSlot(key, {
              photo: photoObj,
              isCompressing: false,
              status: 'VALID',
              validationResult: result,
              error: null,
            })
          } else {
            updateSlot(key, {
              photo: photoObj,
              isCompressing: false,
              status: 'INVALID',
              validationResult: result,
              error: result.message || 'Ảnh không đạt chuẩn kiểm định góc chụp.',
            })
          }
        } catch (err: unknown) {
          if (latestRequestRef.current.get(key) !== requestId) return
          const anyErr = err as { name?: string; response?: { data?: { message?: string } } }
          if (anyErr?.name === 'CanceledError' || anyErr?.name === 'AbortError') return
          updateSlot(key, {
            photo: photoObj,
            isCompressing: false,
            status: 'ERROR',
            validationResult: null,
            error: anyErr?.response?.data?.message || 'Không thể kiểm tra ảnh. Vui lòng thử lại.',
          })
        }
      } catch {
        if (latestRequestRef.current.get(key) !== requestId) return
        updateSlot(key, {
          isCompressing: false,
          status: 'ERROR',
          error: 'Không thể kiểm tra ảnh. Vui lòng thử lại.',
        })
      }
    },
    [updateSlot],
  )

  const invalidateSlots = useCallback(
    (invalidAnglesMap?: Record<string, { errorCode?: string; message?: string }>) => {
      if (!invalidAnglesMap) return
      setSlots((prev) => {
        const next = { ...prev }
        for (const [angle, info] of Object.entries(invalidAnglesMap)) {
          const slotKey = angle as AngleCode
          if (next[slotKey]) {
            next[slotKey] = {
              ...next[slotKey]!,
              status: 'INVALID',
              error: info?.message || 'Ảnh không đạt chuẩn kiểm định.',
            }
          }
        }
        return next
      })
    },
    [],
  )

  const countReady = useCallback(
    (keys: readonly AngleCode[]) =>
      keys.filter((key) => {
        const isId = key === 'CCCD_FRONT' || key === 'CCCD_BACK'
        return isSlotReady(slots[key], isId)
      }).length,
    [slots],
  )

  /** Files in the given key order, or `null` while any photo is missing or still compressing/validating. */
  const getOrderedFiles = useCallback(
    (keys: readonly AngleCode[]): File[] | null => {
      const files = keys.map((key) => {
        const isId = key === 'CCCD_FRONT' || key === 'CCCD_BACK'
        return isSlotReady(slots[key], isId) ? slots[key]?.photo?.file : null
      })
      return files.every((file): file is File => file instanceof File) ? files : null
    },
    [slots],
  )

  const getSlot = useCallback((key: AngleCode) => slots[key] ?? EMPTY_PHOTO_SLOT, [slots])

  return { getSlot, capture, countReady, getOrderedFiles, invalidateSlots }
}
