import { useCallback, useEffect, useRef, useState } from 'react'
import type { AngleCode } from '@/types'
import { compressImage } from '@/utils/imageCompression'

const MAX_DIMENSION_PX = 1280

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export interface CapturedPhoto {
  /** Compressed file, renamed to `<ANGLE_CODE>.<ext>`. */
  file: File
  previewUrl: string
  capturedAt: Date
}

export interface PhotoSlot {
  /** Last successfully compressed photo; kept while a retake is being processed. */
  photo: CapturedPhoto | null
  isCompressing: boolean
  error: string | null
}

export const EMPTY_PHOTO_SLOT: PhotoSlot = { photo: null, isCompressing: false, error: null }

export function isSlotReady(slot: PhotoSlot | undefined): boolean {
  return Boolean(slot?.photo) && !slot?.isCompressing
}

/** Compresses captured photos per angle and owns their preview object URLs. */
export function usePhotoCapture() {
  const [slots, setSlots] = useState<Partial<Record<AngleCode, PhotoSlot>>>({})
  const previewUrlsRef = useRef(new Map<AngleCode, string>())
  const latestRequestRef = useRef(new Map<AngleCode, number>())

  useEffect(() => {
    const previewUrls = previewUrlsRef.current
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      previewUrls.clear()
    }
  }, [])

  const updateSlot = useCallback((key: AngleCode, patch: Partial<PhotoSlot>) => {
    setSlots((prev) => ({ ...prev, [key]: { ...EMPTY_PHOTO_SLOT, ...prev[key], ...patch } }))
  }, [])

  const capture = useCallback(
    async (key: AngleCode, file: File) => {
      // A retake can start before the previous compression finishes; only the latest one wins.
      const requestId = (latestRequestRef.current.get(key) ?? 0) + 1
      latestRequestRef.current.set(key, requestId)
      updateSlot(key, { isCompressing: true, error: null })

      try {
        const compressed = await compressImage(file, MAX_DIMENSION_PX)
        if (latestRequestRef.current.get(key) !== requestId) return

        const extension = EXTENSION_BY_TYPE[compressed.type] ?? 'jpg'
        const renamed = new File([compressed], `${key}.${extension}`, { type: compressed.type })
        const previewUrl = URL.createObjectURL(renamed)

        const previousUrl = previewUrlsRef.current.get(key)
        if (previousUrl) URL.revokeObjectURL(previousUrl)
        previewUrlsRef.current.set(key, previewUrl)

        updateSlot(key, {
          photo: { file: renamed, previewUrl, capturedAt: new Date() },
          isCompressing: false,
        })
      } catch {
        if (latestRequestRef.current.get(key) !== requestId) return
        updateSlot(key, {
          isCompressing: false,
          error: 'Không xử lý được ảnh. Vui lòng chụp lại.',
        })
      }
    },
    [updateSlot],
  )

  const countReady = useCallback(
    (keys: readonly AngleCode[]) => keys.filter((key) => isSlotReady(slots[key])).length,
    [slots],
  )

  /** Files in the given key order, or `null` while any photo is missing or still compressing. */
  const getOrderedFiles = useCallback(
    (keys: readonly AngleCode[]): File[] | null => {
      const files = keys.map((key) => (isSlotReady(slots[key]) ? slots[key]?.photo?.file : null))
      return files.every((file): file is File => file instanceof File) ? files : null
    },
    [slots],
  )

  const getSlot = useCallback((key: AngleCode) => slots[key] ?? EMPTY_PHOTO_SLOT, [slots])

  return { getSlot, capture, countReady, getOrderedFiles }
}
