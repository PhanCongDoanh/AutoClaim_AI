import type { VehicleStatus } from '@/types'

export const VEHICLE_STATUS_META: Record<VehicleStatus, { label: string; dotClass: string; textClass: string }> = {
  AVAILABLE: { label: 'Sẵn sàng', dotClass: 'bg-emerald-500', textClass: 'text-emerald-700' },
  RENTED: { label: 'Đang thuê', dotClass: 'bg-amber-500', textClass: 'text-amber-700' },
  MAINTENANCE: { label: 'Bảo trì', dotClass: 'bg-red-500', textClass: 'text-red-700' },
}
