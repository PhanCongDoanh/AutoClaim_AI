/** Side-view car inside a camera viewfinder with an AI damage detection box. Decorative only. */
export function ScanIllustration() {
  return (
    <svg viewBox="0 0 420 220" className="w-full max-w-md" aria-hidden="true">
      {/* Viewfinder corners */}
      <g className="stroke-blue-400" strokeWidth="3" fill="none" strokeLinecap="square">
        <path d="M20 46V20H46" />
        <path d="M374 20H400V46" />
        <path d="M20 174V200H46" />
        <path d="M374 200H400V174" />
      </g>

      {/* Body */}
      <path
        d="M44 150V124Q46 110 72 106L124 100L166 72Q176 64 196 64H276Q296 64 312 77L342 102L372 108Q384 111 384 126V150Z"
        fill="#1b2747"
        stroke="#64748b"
        strokeOpacity="0.6"
        strokeWidth="2"
      />
      {/* Windows */}
      <path d="M140 100L174 76Q180 72 192 72H230V100Z" fill="#334366" />
      <path d="M238 72H276Q290 72 302 82L322 100H238Z" fill="#334366" />
      <line x1="234" y1="72" x2="234" y2="150" stroke="#475569" strokeOpacity="0.6" />

      {/* Scan line with tail light and headlight */}
      <line x1="44" y1="120" x2="384" y2="120" className="stroke-blue-500" strokeWidth="2" />
      <rect x="40" y="114" width="10" height="10" rx="2" className="fill-red-500" />
      <rect x="374" y="114" width="14" height="8" rx="2" className="fill-amber-100" />

      {/* Wheels */}
      {[110, 316].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="152" r="26" fill="#111827" />
          <circle cx={cx} cy="152" r="12" className="fill-slate-400" />
        </g>
      ))}

      {/* AI detection */}
      <rect x="250" y="104" width="62" height="34" rx="3" fill="none" className="stroke-red-500" strokeWidth="2.5" />
      <rect x="250" y="88" width="48" height="14" rx="2" className="fill-red-500" />
      <text x="256" y="98.5" className="fill-white text-[9px] font-bold">
        AI 0.89
      </text>
    </svg>
  )
}
