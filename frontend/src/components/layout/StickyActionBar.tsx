import type { ReactNode } from 'react'

interface StickyActionBarProps {
  /** Status or helper text on the left. */
  info?: ReactNode
  /** Buttons on the right. */
  children: ReactNode
}

/** Floating rounded bar that sticks to the bottom of the viewport while its section scrolls. */
export function StickyActionBar({ info, children }: StickyActionBarProps) {
  return (
    <div className="sticky bottom-4 z-20 rounded-2xl border border-white bg-white/90 shadow-[0_14px_36px_-14px_rgba(15,23,42,0.3)] backdrop-blur-md">
      <div className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-slate-600">{info}</div>
        <div className="flex items-center justify-end gap-3">{children}</div>
      </div>
    </div>
  )
}
