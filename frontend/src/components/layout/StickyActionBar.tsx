import type { ReactNode } from 'react'

interface StickyActionBarProps {
  /** Status or helper text on the left. */
  info?: ReactNode
  /** Buttons on the right. */
  children: ReactNode
}

/** Bottom bar pinned to the viewport. Pages using it need `pb-24`. */
export function StickyActionBar({ info, children }: StickyActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">{info}</div>
        <div className="flex items-center justify-end gap-3">{children}</div>
      </div>
    </div>
  )
}
