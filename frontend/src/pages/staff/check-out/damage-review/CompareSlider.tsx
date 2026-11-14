import { ChevronsLeftRight } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { AnnotatedImage, type DamageOverlay } from './AnnotatedImage'

interface CompareSliderProps {
  checkInUrl: string | null
  checkOutUrl: string
  checkInBadge: string
  checkOutBadge: string
  overlays: DamageOverlay[]
  alt: string
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, value))

/**
 * "Trượt so sánh": the check-in and check-out photos stacked in the same box; dragging the vertical divider
 * reveals the check-out photo (with damage overlays) on the right. Works with mouse, touch and ←/→ keys.
 */
export function CompareSlider({ checkInUrl, checkOutUrl, checkInBadge, checkOutBadge, overlays, alt }: CompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  function updateFromPointer(clientX: number) {
    const box = containerRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return
    setPosition(clampPercent(((clientX - box.left) / box.width) * 100))
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
    updateFromPointer(event.clientX)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 2
    if (event.key === 'ArrowLeft') setPosition((p) => clampPercent(p - step))
    else if (event.key === 'ArrowRight') setPosition((p) => clampPercent(p + step))
    else if (event.key === 'Home') setPosition(0)
    else if (event.key === 'End') setPosition(100)
    else return
    event.preventDefault()
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-ew-resize touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={(event) => isDragging && updateFromPointer(event.clientX)}
      onPointerUp={() => setIsDragging(false)}
      onPointerCancel={() => setIsDragging(false)}
    >
      <AnnotatedImage key={`in-${checkInUrl}`} src={checkInUrl} alt={`${alt} – lúc check-in`} badge={checkInBadge} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
        <AnnotatedImage
          key={`out-${checkOutUrl}`}
          src={checkOutUrl}
          alt={`${alt} – lúc check-out`}
          overlays={overlays}
          badge={checkOutBadge}
          badgeTone="checkOut"
          className="bg-slate-100"
        />
      </div>

      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${position}%` }}>
        <div
          role="slider"
          tabIndex={0}
          aria-label="Vị trí thanh so sánh"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          onKeyDown={handleKeyDown}
          className="pointer-events-auto absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ChevronsLeftRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}
