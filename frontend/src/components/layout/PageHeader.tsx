import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  description?: ReactNode
  /** Right-aligned controls (search, primary action...). */
  actions?: ReactNode
}

/** Page title block: tinted icon tile + large title on the left, actions on the right. */
export function PageHeader({ icon: Icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl border border-white bg-gradient-to-b from-[#e9f0fd] to-[#dbe6fb] text-brand-600 shadow-[0_8px_20px_-12px_rgba(37,99,235,0.55)]">
          <Icon className="h-7 w-7" strokeWidth={2} />
        </span>
        <div className="space-y-1">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[32px]">{title}</h1>
          {description && <p className="text-[15px] text-slate-600">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{actions}</div>}
    </div>
  )
}

/** Shared look for the primary call-to-action next to a page title. */
export const PAGE_PRIMARY_ACTION_CLASS =
  'h-11 rounded-xl bg-gradient-to-b from-[#2f6df3] to-[#1d4fd8] px-6 text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(37,99,235,0.7)] hover:from-[#2a63e0] hover:to-[#1a47c4] [&_svg]:size-5'
