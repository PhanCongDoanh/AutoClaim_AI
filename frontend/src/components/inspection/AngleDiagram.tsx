import { cn } from '@/lib/utils'
import type { AngleCode } from '@/types'
import { ANGLE_LABELS, VEHICLE_PHOTO_KEYS } from './photoAngles'

/** Marker positions (SVG units) around a top-down car facing up; matches `VEHICLE_PHOTO_KEYS`. */
const MARKER_POSITIONS: Record<(typeof VEHICLE_PHOTO_KEYS)[number], { x: number; y: number }> = {
  ANGLE_1: { x: 100, y: 18 },
  ANGLE_2: { x: 34, y: 56 },
  ANGLE_3: { x: 20, y: 140 },
  ANGLE_4: { x: 34, y: 224 },
  ANGLE_5: { x: 100, y: 262 },
  ANGLE_6: { x: 166, y: 224 },
  ANGLE_7: { x: 180, y: 140 },
  ANGLE_8: { x: 166, y: 56 },
}

interface AngleDiagramProps {
  isCaptured: (key: AngleCode) => boolean
  /** Angle the staff member should shoot next, highlighted in blue. */
  currentKey?: AngleCode
}

export function AngleDiagram({ isCaptured, currentKey }: AngleDiagramProps) {
  return (
    <div className="space-y-4">
      <svg viewBox="0 0 200 280" className="mx-auto w-full max-w-[220px]" role="img" aria-label="Sơ đồ 8 góc chụp quanh xe">
        {/* Wheels */}
        {[
          [62, 70],
          [130, 70],
          [62, 190],
          [130, 190],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="8" height="26" rx="3" className="fill-slate-600" />
        ))}
        {/* Body */}
        <rect x="68" y="44" width="64" height="192" rx="30" className="fill-slate-100 stroke-slate-400" strokeWidth="2" />
        {/* Windshield, roof, rear window */}
        <path d="M76 96 Q100 82 124 96 L120 116 Q100 110 80 116 Z" className="fill-slate-300" />
        <rect x="80" y="122" width="40" height="52" rx="6" className="fill-slate-200" />
        <path d="M80 182 Q100 188 120 182 L124 200 Q100 210 76 200 Z" className="fill-slate-300" />

        {VEHICLE_PHOTO_KEYS.map((key, index) => {
          const { x, y } = MARKER_POSITIONS[key]
          const captured = isCaptured(key)
          const current = !captured && key === currentKey
          return (
            <g key={key}>
              <title>{`${index + 1}. ${ANGLE_LABELS[key]}`}</title>
              {current && <circle cx={x} cy={y} r="15" className="fill-blue-500/20" />}
              <circle
                cx={x}
                cy={y}
                r="11"
                className={cn(
                  captured ? 'fill-emerald-500' : current ? 'fill-blue-600' : 'fill-slate-300',
                )}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-white text-[11px] font-semibold"
              >
                {index + 1}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Đã chụp
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Đang chụp
        </span>
      </div>
    </div>
  )
}
