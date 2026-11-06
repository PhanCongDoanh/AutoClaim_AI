import type { ReactNode } from 'react'

interface SectionCardHeaderProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function SectionCardHeader({ icon, title, description, action }: SectionCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-secondary text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}
