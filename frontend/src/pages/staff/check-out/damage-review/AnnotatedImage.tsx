import { ImageOff } from 'lucide-react'
import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useElementSize } from '@/hooks/useElementSize'
import { getPolygonTopLeft, type NormalizedPoint } from '@/lib/boundingBox'
import { cn } from '@/lib/utils'

/** A damage region drawn over the check-out image. */
export interface DamageOverlay {
  id: string
  polygon: readonly NormalizedPoint[]
  /** e.g. "#1 Trầy xước 89%". */
  label: string
  selected: boolean
}

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/** Where an `object-contain` image is actually painted inside its box (letterboxing removed). */
function getContainRect(boxWidth: number, boxHeight: number, imageWidth: number, imageHeight: number): Rect | null {
  if (!boxWidth || !boxHeight || !imageWidth || !imageHeight) return null
  const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale
  return { left: (boxWidth - width) / 2, top: (boxHeight - height) / 2, width, height }
}

interface AnnotatedImageProps {
  src: string | null
  alt: string
  overlays?: DamageOverlay[]
  onSelectOverlay?: (id: string) => void
  /** Corner badge, e.g. "CHECK-OUT · 30/10 16:48". */
  badge?: ReactNode
  /** Dark on the left (check-in) or red on the right (check-out). */
  badgeTone?: 'checkIn' | 'checkOut'
  className?: string
  style?: CSSProperties
}

/**
 * Image fitted with `object-contain`, plus an SVG overlay that covers exactly the painted image area (computed
 * from the image's natural aspect ratio), so normalised 0..1 polygons line up at any box size.
 * Callers should pass `key={src}` so the measured natural size resets when the image changes.
 */
export function AnnotatedImage({
  src,
  alt,
  overlays = [],
  onSelectOverlay,
  badge,
  badgeTone = 'checkIn',
  className,
  style,
}: AnnotatedImageProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const box = useElementSize(boxRef)
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const rect = natural ? getContainRect(box.width, box.height, natural.width, natural.height) : null

  // Selected region last so it is painted on top.
  const ordered = [...overlays].sort((a, b) => Number(a.selected) - Number(b.selected))

  return (
    <div ref={boxRef} className={cn('relative h-full w-full overflow-hidden', className)} style={style}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-contain"
          onLoad={(event) =>
            setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
          }
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <ImageOff className="h-6 w-6" />
          {src ? 'Không tải được ảnh' : 'Không có ảnh'}
        </div>
      )}

      {rect && ordered.length > 0 && (
        <div
          className="pointer-events-none absolute"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        >
          <svg
            className="absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {ordered.map((overlay) => (
              <polygon
                key={overlay.id}
                points={overlay.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
                vectorEffect="non-scaling-stroke"
                className={cn(
                  'stroke-red-600 transition-[fill-opacity,stroke-width]',
                  onSelectOverlay && 'pointer-events-auto cursor-pointer',
                )}
                fill="rgb(220 38 38)"
                fillOpacity={overlay.selected ? 0.28 : 0.12}
                strokeWidth={overlay.selected ? 3 : 1.5}
                strokeLinejoin="round"
                onClick={onSelectOverlay ? () => onSelectOverlay(overlay.id) : undefined}
              />
            ))}
          </svg>
          {ordered.map((overlay) => {
            const [x, y] = getPolygonTopLeft(overlay.polygon)
            const below = y < 0.1 // no room above the region → put the label inside it
            return (
              <span
                key={overlay.id}
                className={cn(
                  'absolute whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold leading-tight text-white shadow',
                  overlay.selected ? 'z-10 bg-red-600 text-xs' : 'bg-red-600/75',
                )}
                style={{
                  left: `${Math.min(x, 0.85) * 100}%`,
                  top: `${y * 100}%`,
                  transform: below ? 'translateY(2px)' : 'translateY(calc(-100% - 2px))',
                }}
              >
                {overlay.label}
              </span>
            )
          })}
        </div>
      )}

      {badge && (
        <span
          className={cn(
            'pointer-events-none absolute top-3 z-20 rounded-md px-2 py-1 text-xs font-semibold text-white shadow',
            badgeTone === 'checkIn' ? 'left-3 bg-slate-700/90' : 'right-3 bg-red-600',
          )}
        >
          {badge}
        </span>
      )}
    </div>
  )
}
