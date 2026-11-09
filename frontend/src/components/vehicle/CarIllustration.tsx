import { useId } from 'react'

const BODY_COLORS = ['#e5e9f0', '#cbd5e1', '#94a3b8', '#dbe4ee'] as const

function pickColor(seed: string): string {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return BODY_COLORS[Math.abs(hash) % BODY_COLORS.length]
}

interface CarIllustrationProps {
  /** Stable value (e.g. vehicle id) so each car keeps the same body color. */
  seed: string
}

/** Placeholder art for vehicles without a photo: side-view sedan on a road. */
export function CarIllustration({ seed }: CarIllustrationProps) {
  const gradientId = useId()
  const body = pickColor(seed)
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="1" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${gradientId})`} />
      <rect y="142" width="320" height="38" fill="#cbd5e1" />
      {[20, 110, 200, 290].map((x) => (
        <rect key={x} x={x} y="160" width="50" height="3" rx="1.5" fill="#f8fafc" opacity="0.8" />
      ))}

      <path
        d="M36 136V112Q38 100 62 97L104 92L140 66Q150 58 168 58H222Q240 58 254 70L280 92L300 96Q312 99 312 112V136Z"
        fill={body}
        stroke="#64748b"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      <path d="M118 92L148 70Q154 66 164 66H196V92Z" fill="#475569" />
      <path d="M202 66H222Q234 66 244 74L262 92H202Z" fill="#475569" />
      <line x1="199" y1="66" x2="199" y2="136" stroke="#64748b" strokeOpacity="0.4" />
      <rect x="32" y="108" width="7" height="8" rx="1.5" fill="#ef4444" />
      <rect x="305" y="106" width="10" height="6" rx="1.5" fill="#fef3c7" />

      {[92, 262].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="138" r="20" fill="#1e293b" />
          <circle cx={cx} cy="138" r="8" fill="#cbd5e1" />
        </g>
      ))}
    </svg>
  )
}
