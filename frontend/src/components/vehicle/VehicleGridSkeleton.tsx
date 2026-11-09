import { Card } from '@/components/ui/card'

/** Placeholder for a `VehicleCard` grid while vehicles load. */
export function VehicleGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Đang tải danh sách xe">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="overflow-hidden">
          <div className="aspect-video animate-pulse bg-muted" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
          </div>
        </Card>
      ))}
    </div>
  )
}
