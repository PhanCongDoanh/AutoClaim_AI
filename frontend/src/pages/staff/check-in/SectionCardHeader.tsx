import type { ReactNode } from 'react'

/** Shared surface for every white card on the Check-in tab. */
export const CHECK_IN_CARD_CLASS =
  'rounded-2xl border border-white bg-white/95 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.2)] backdrop-blur'

/** Shared look for text inputs on the Check-in form. */
export const CHECK_IN_INPUT_CLASS =
  'h-11 rounded-lg border-slate-200 bg-white text-[14px] shadow-none placeholder:text-slate-400 focus-visible:border-brand-500 focus-visible:ring-brand-500/25'

interface SectionCardHeaderProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function SectionCardHeader({ icon, title, description, action }: SectionCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e9f0fd] text-brand-600 [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <div className="space-y-0.5">
          <h2 className="text-[16px] font-bold text-slate-900">{title}</h2>
          <p className="text-[13px] text-slate-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}
