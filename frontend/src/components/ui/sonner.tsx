import { Toaster as Sonner, type ToasterProps } from 'sonner'

/** App-wide toast outlet; trigger toasts with `toast.success(...)` / `toast.error(...)` from `sonner`. */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      toastOptions={{ classNames: { toast: 'font-sans text-sm' } }}
      {...props}
    />
  )
}
