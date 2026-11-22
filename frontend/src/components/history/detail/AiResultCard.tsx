import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { getActiveDamages, getAngleTitle, getDamageLabel, getOverriddenDamages, toPercent, type DamageEntry } from '@/lib/damage'
import { formatDayMonthTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SessionResultResponse } from '@/types'

/** "Trầy xước · Cửa trước trái". */
function getTitle({ damage }: DamageEntry): string {
  const type = getDamageLabel(damage.damageType)
  return damage.partName ? `${type} · ${damage.partName}` : type
}

/**
 * "Kết quả AI": damages kept by staff ("Hư hại mới") then detections rejected as AI mistakes (struck through, with
 * reason, who and when — older rows only have the reason). Numbered like the report: active #1..n, then rejected.
 */
export function AiResultCard({ session }: { session: SessionResultResponse }) {
  const active = getActiveDamages(session.images)
  const overridden = getOverriddenDamages(session.images)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold text-foreground">Kết quả AI</h2>
          <p className="text-sm text-muted-foreground">
            {active.length} hư hại mới · {overridden.length} lỗi đã được nhân viên loại bỏ
          </p>
        </div>
      </div>

      {active.length === 0 && overridden.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">AI không phát hiện hư hại mới nào.</p>
      ) : (
        <ol className="divide-y">
          {active.map((entry, index) => (
            <DamageRow key={entry.damage.detectionId} entry={entry} number={index + 1} />
          ))}
          {overridden.map((entry, index) => (
            <DamageRow key={entry.damage.detectionId} entry={entry} number={active.length + index + 1} />
          ))}
        </ol>
      )}
    </Card>
  )
}

function DamageRow({ entry, number }: { entry: DamageEntry; number: number }) {
  const { damage, image } = entry
  const isOverridden = damage.isOverridden
  const overrideMeta = [
    damage.overriddenByName,
    damage.overriddenAt ? formatDayMonthTime(damage.overriddenAt) : null,
  ].filter(Boolean)

  return (
    <li className={cn('space-y-1 px-5 py-4', isOverridden && 'bg-slate-50/60')}>
      <div className="flex items-start justify-between gap-3">
        <p className={cn('font-semibold', isOverridden ? 'text-slate-400 line-through' : 'text-foreground')}>
          #{number} {getTitle(entry)}
        </p>
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-0.5 text-xs font-medium',
            isOverridden ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-700',
          )}
        >
          {isOverridden ? 'AI nhầm' : 'Hư hại mới'}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {getAngleTitle(image.angleCode)} · Độ tin cậy {toPercent(damage.confidenceScore)}%
      </p>
      {isOverridden && (
        <p className="text-sm text-slate-600">
          Lý do: {damage.overrideReason ?? '—'}
          {overrideMeta.length > 0 && ` · ${overrideMeta.join(' · ')}`}
        </p>
      )}
    </li>
  )
}
