import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Page numbers to show: first, last, current ± 1, with null for gaps ("…"). */
function getPageItems(page: number, totalPages: number): (number | null)[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const items: (number | null)[] = []
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) items.push(null)
    items.push(p)
  })
  return items
}

interface HistoryPaginationProps {
  /** 1-based. */
  page: number
  totalPages: number
  disabled?: boolean
  onPageChange: (page: number) => void
}

export function HistoryPagination({ page, totalPages, disabled = false, onPageChange }: HistoryPaginationProps) {
  if (totalPages <= 1) return null
  return (
    <nav className="flex items-center gap-1.5" aria-label="Phân trang">
      <Button
        variant="secondary"
        size="sm"
        className="h-9 rounded-lg"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft />
        Trước
      </Button>
      {getPageItems(page, totalPages).map((item, index) =>
        item === null ? (
          <span key={`gap-${index}`} className="px-1 text-slate-400" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            disabled={disabled}
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              'hidden h-9 min-w-9 rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-block',
              item === page ? 'bg-[#e4edfd] text-brand-700' : 'text-slate-700 hover:bg-slate-100',
            )}
          >
            {item}
          </button>
        ),
      )}
      <Button
        variant="secondary"
        size="sm"
        className="h-9 rounded-lg"
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Sau
        <ChevronRight />
      </Button>
    </nav>
  )
}
