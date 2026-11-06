import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const fieldClasses =
  'w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive'

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input type={type} className={cn(fieldClasses, 'h-10 py-2', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldClasses, 'min-h-24 py-2', className)} {...props} />
}
