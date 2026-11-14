import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { AngleCode } from '@/types'
import { ANGLE_LABELS, VEHICLE_PHOTO_KEYS } from './photoAngles'

/** Marker positions (SVG units) around a top-down car facing up; matches `VEHICLE_PHOTO_KEYS`. */
const MARKER_POSITIONS: Record<(typeof VEHICLE_PHOTO_KEYS)[number], { x: number; y: number }> = {
  ANGLE_1: { x: 100, y: 18 },
  ANGLE_2: { x: 32, y: 66 },
  ANGLE_3: { x: 18, y: 146 },
  ANGLE_4: { x: 32, y: 226 },
  ANGLE_5: { x: 100, y: 274 },
  ANGLE_6: { x: 168, y: 226 },
  ANGLE_7: { x: 182, y: 146 },
  ANGLE_8: { x: 168, y: 66 },
}

/** Wheel rectangles peeking out from under the body. */
const WHEELS = [
  [57, 74],
  [135, 74],
  [57, 190],
  [135, 190],
] as const

interface AngleDiagramProps {
  isCaptured: (key: AngleCode) => boolean
  /** Angle the staff member should shoot next, highlighted in blue. */
  currentKey?: AngleCode
}

export function AngleDiagram({ isCaptured, currentKey }: AngleDiagramProps) {
  const bodyGradientId = useId()
  const glassGradientId = useId()

  return (
    <div className="space-y-5">
      <svg viewBox="0 0 200 292" className="mx-auto w-full max-w-[210px]" role="img" aria-label="Sơ đồ 8 góc chụp quanh xe">
        <defs>
          <linearGradient id={bodyGradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#eef2f8" />
            <stop offset="0.5" stopColor="#ffffff" />
            <stop offset="1" stopColor="#eef2f8" />
          </linearGradient>
          <linearGradient id={glassGradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#c7d4e6" />
            <stop offset="1" stopColor="#e2e9f3" />
          </linearGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="100" cy="146" rx="46" ry="108" fill="#1e3a8a" opacity="0.06" />

        {WHEELS.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="9" height="28" rx="3.5" fill="#334155" />
        ))}

        {/* Body */}
        <path
          d="M100 44C124 44 136 50 138 70L140 116V204C140 232 128 246 100 246C72 246 60 232 60 204V116L62 70C64 50 76 44 100 44Z"
          fill={`url(#${bodyGradientId})`}
          stroke="#64748b"
          strokeWidth="2"
        />
        {/* Side mirrors */}
        <path d="M61 104L50 100Q47 104 50 109L61 110Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
        <path d="M139 104L150 100Q153 104 150 109L139 110Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
        {/* Headlights */}
        <path d="M70 56Q76 50 86 49L84 56Z" fill="#cbd5e1" />
        <path d="M130 56Q124 50 114 49L116 56Z" fill="#cbd5e1" />
        {/* Hood crease */}
        <path d="M82 60Q100 66 118 60" fill="none" stroke="#94a3b8" strokeWidth="1" opacity="0.6" />
        {/* Windshield */}
        <path
          d="M70 100Q100 86 130 100L124 128Q100 121 76 128Z"
          fill={`url(#${glassGradientId})`}
          stroke="#64748b"
          strokeWidth="1.5"
        />
        {/* Roof */}
        <rect x="76" y="132" width="48" height="52" rx="9" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.25" />
        {/* Rear window */}
        <path
          d="M76 188Q100 194 124 188L129 210Q100 220 71 210Z"
          fill={`url(#${glassGradientId})`}
          stroke="#64748b"
          strokeWidth="1.5"
        />
        {/* Tail lights */}
        <path d="M66 232Q72 239 82 241" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round" />
        <path d="M134 232Q128 239 118 241" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round" />

        {VEHICLE_PHOTO_KEYS.map((key, index) => {
          const { x, y } = MARKER_POSITIONS[key]
          const captured = isCaptured(key)
          const current = !captured && key === currentKey
          return (
            <g key={key}>
              <title>{`${index + 1}. ${ANGLE_LABELS[key]}`}</title>
              {current && (
                <circle cx={x} cy={y} r="18" className="fill-blue-500/20">
                  <animate attributeName="r" values="15;19;15" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={x}
                cy={y}
                r="13"
                strokeWidth="2.5"
                className={cn(
                  'stroke-white',
                  captured ? 'fill-emerald-500' : current ? 'fill-blue-600' : 'fill-slate-300',
                )}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-white text-[12px] font-bold"
              >
                {index + 1}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="flex items-center justify-center gap-5 text-[13px] font-medium text-slate-600">
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
