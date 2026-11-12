import { useId, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FieldControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby'?: string
  required?: boolean
}

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  /** Leading icon rendered inside the control; the control needs `pl-9`. */
  icon?: ReactNode
  className?: string
  labelClassName?: string
  children: (props: FieldControlProps) => ReactNode
}

export function FormField({ label, required, error, hint, icon, className, labelClassName, children }: FormFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  const control = children({
    id,
    required,
    'aria-invalid': Boolean(error),
    'aria-describedby': message ? messageId : undefined,
  })

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} className={labelClassName}>
        {label}
        {required && <span className="ml-0.5 text-muted-foreground">*</span>}
      </Label>
      {icon ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
          {control}
        </div>
      ) : (
        control
      )}
      {message && (
        <p id={messageId} className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
          {message}
        </p>
      )}
    </div>
  )
}
