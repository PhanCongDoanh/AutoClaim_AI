import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface CheckOutPageHeaderProps {
  title: string
  description: string
  /** Intercepts "Quay lại danh sách xe" (e.g. to confirm discarding photos); defaults to a plain link. */
  onBack?: () => void
}

export function CheckOutPageHeader({ title, description, onBack }: CheckOutPageHeaderProps) {
  return (
    <div>
      {onBack ? (
        <Button variant="link" size="sm" className="h-auto px-0 text-muted-foreground" onClick={onBack}>
          <ArrowLeft />
          Quay lại danh sách xe
        </Button>
      ) : (
        <Button asChild variant="link" size="sm" className="h-auto px-0 text-muted-foreground">
          <Link to="/staff">
            <ArrowLeft />
            Quay lại danh sách xe
          </Link>
        </Button>
      )}
      <h1 className="mt-2 text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
