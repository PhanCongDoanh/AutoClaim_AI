import { CalendarClock, Search, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { HistoryStaffOption, HistoryResultFilter, UUID } from '@/types'
import { ALL_MONTHS, formatMonth } from './historyQuery'

const SEARCH_DEBOUNCE_MS = 300

/** Value of "Nhân viên: Tất cả" in the select (Radix Select does not allow an empty value). */
const ALL_STAFF = 'all'

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
  /** Second row of filters (admin page: `AdminFiltersRow`). */
  extraRow?: ReactNode
}

export interface AdminHistoryFiltersProps {
  staffId: UUID | null
  staffOptions: HistoryStaffOption[]
  /** True while the staff list loads. */
  staffLoading: boolean
  onStaffChange: (staffId: UUID | null) => void
  overrideOnly: boolean
  onOverrideOnlyChange: (overrideOnly: boolean) => void
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
  extraRow,
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

  const filtersRow = (
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

  if (!extraRow) return filtersRow
  return (
    <div className="space-y-3">
      {filtersRow}
      {extraRow}
    </div>
  )
}

function getStaffLabel(option: HistoryStaffOption): string {
  const tags = [option.deleted && 'đã nghỉ', option.roleName === 'ADMIN' && 'Admin'].filter(Boolean)
  return tags.length > 0 ? `${option.fullName} (${tags.join(', ')})` : option.fullName
}

/** "Nhân viên: Tất cả / <tên>" (staff who reviewed the return) · "Chỉ lượt có lỗi AI bị loại". */
export function AdminFiltersRow({
  staffId,
  staffOptions,
  staffLoading,
  onStaffChange,
  overrideOnly,
  onOverrideOnlyChange,
}: AdminHistoryFiltersProps) {
  const checkboxId = useId()
  // A staff id from the URL that is not in the list (e.g. never ran a check-out) still needs an option.
  const hasUnknownStaff = staffId !== null && !staffLoading && !staffOptions.some((o) => o.userId === staffId)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
      <Select
        value={staffId ?? ALL_STAFF}
        onValueChange={(value) => onStaffChange(value === ALL_STAFF ? null : value)}
        disabled={staffLoading}
      >
        <SelectTrigger className="h-11 sm:w-80" aria-label="Lọc theo nhân viên nhận lại xe">
          <span className="flex min-w-0 items-center gap-2">
            <UserRound className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="truncate">
              Nhân viên: <SelectValue placeholder="Đang tải…" />
            </span>
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STAFF}>Tất cả</SelectItem>
          {hasUnknownStaff && <SelectItem value={staffId}>Không rõ</SelectItem>}
          {staffOptions.map((option) => (
            <SelectItem key={option.userId} value={option.userId}>
              {getStaffLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2.5">
        <Checkbox
          id={checkboxId}
          checked={overrideOnly}
          onCheckedChange={(checked) => onOverrideOnlyChange(checked === true)}
        />
        <Label htmlFor={checkboxId} className="cursor-pointer text-sm font-medium text-slate-700">
          Chỉ lượt có lỗi AI bị loại
        </Label>
      </div>
    </div>
  )
}
