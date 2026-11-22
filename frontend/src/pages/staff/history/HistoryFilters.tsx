import { CalendarClock, Search, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { HistoryResultFilter } from '@/types'
import { ALL_MONTHS, formatMonth } from './historyQuery'

const SEARCH_DEBOUNCE_MS = 300

const RESULT_OPTIONS: { value: HistoryResultFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'DAMAGED', label: 'Có hư hại mới' },
  { value: 'CLEAN', label: 'Không hư hại' },
]

interface HistoryFiltersBarProps {
  search: string
  onSearchChange: (search: string) => void
  result: HistoryResultFilter
  onResultChange: (result: HistoryResultFilter) => void
  /** `YYYY-MM` or `all`; null while the default month is being resolved. */
  month: string | null
  months: string[]
  onMonthChange: (month: string) => void
}

/** Search (debounced) · result filter · month filter (mockups S1 / S2 / S2b). */
export function HistoryFiltersBar({
  search,
  onSearchChange,
  result,
  onResultChange,
  month,
  months,
  onMonthChange,
}: HistoryFiltersBarProps) {
  const [draft, setDraft] = useState(search)
  const onSearchChangeRef = useRef(onSearchChange)
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange
  })

  useEffect(() => {
    if (draft.trim() === search.trim()) return
    const timer = setTimeout(() => onSearchChangeRef.current(draft), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, search])

  // A chosen month that has no data any more still needs an option to show.
  const monthOptions = month && month !== ALL_MONTHS && !months.includes(month) ? [month, ...months] : months

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" />
        <Input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Tìm biển số, tên xe hoặc tên khách..."
          className="h-11 pl-10"
          aria-label="Tìm lượt trả xe"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:flex">
        <Select value={result} onValueChange={(value) => onResultChange(value as HistoryResultFilter)}>
          <SelectTrigger className="h-11 lg:w-56" aria-label="Lọc theo kết quả">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-500" />
              <span>
                Kết quả: <SelectValue />
              </span>
            </span>
          </SelectTrigger>
          <SelectContent>
            {RESULT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={month ?? undefined} onValueChange={onMonthChange} disabled={month === null}>
          <SelectTrigger className="h-11 lg:w-56" aria-label="Lọc theo tháng trả xe">
            <span className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-slate-500" />
              <SelectValue placeholder="Đang tải…" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_MONTHS}>Tất cả thời gian</SelectItem>
            {monthOptions.map((value) => (
              <SelectItem key={value} value={value}>
                Tháng {formatMonth(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
