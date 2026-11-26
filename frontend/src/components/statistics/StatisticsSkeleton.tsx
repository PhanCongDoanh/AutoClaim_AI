import { Card } from '@/components/ui/card'

/** Full-page skeleton shown on initial load of the Statistics dashboard. */
export function StatisticsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải dữ liệu thống kê">
      {/* Row 1: 4 KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="rounded-2xl border-slate-200/80 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2.5">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                <div className="h-8 w-20 animate-pulse rounded bg-slate-200/80" />
              </div>
              <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-100" />
            </div>
            <div className="mt-5 space-y-2">
              <div className="h-3.5 w-40 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
            </div>
          </Card>
        ))}
      </div>

      {/* Row 2: 2 Charts */}
      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="rounded-2xl border-slate-200/80 p-5 lg:col-span-7">
          <div className="space-y-2">
            <div className="h-5 w-48 animate-pulse rounded bg-slate-200/80" />
            <div className="h-3.5 w-72 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="mt-6 flex h-[260px] items-end justify-between gap-4 px-4 pb-2">
            {[55, 68, 76, 64, 82, 92].map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full max-w-[42px] animate-pulse rounded-t-lg bg-slate-100"
                  style={{ height: `${height}%` }}
                />
                <div className="h-3 w-8 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 p-5 lg:col-span-5">
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200/80" />
            <div className="h-3.5 w-56 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
            <div className="h-44 w-44 shrink-0 animate-pulse rounded-full border-[24px] border-slate-100 bg-white" />
            <div className="w-full space-y-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="flex items-center justify-between gap-3">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="h-3.5 w-14 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 3: Summary Table */}
      <Card className="overflow-hidden rounded-2xl border-slate-200/80">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="h-10 w-80 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-4">
              <div className="h-6 w-6 animate-pulse rounded-full bg-slate-100" />
              <div className="h-11 w-[68px] animate-pulse rounded-lg bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
