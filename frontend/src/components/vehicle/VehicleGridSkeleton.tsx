/** Placeholder for a `VehicleCard` grid while vehicles load. */
export function VehicleGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Đang tải danh sách xe">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
          <div className="aspect-[16/10] animate-pulse bg-slate-100" />
          <div className="space-y-3 px-3.5 pb-3.5 pt-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-6 w-1/2 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
