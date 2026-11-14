import type { VehicleStatus } from '@/types'

interface VehicleStatusMeta {
  label: string
  dotClass: string
  textClass: string
  /** Pill badge on top of the vehicle photo. */
  badgeClass: string
  /** Status filter pill when selected. */
  activeTabClass: string
  /** Count chip inside the selected filter pill. */
  activeCountClass: string
}

export const VEHICLE_STATUS_META: Record<VehicleStatus, VehicleStatusMeta> = {
  AVAILABLE: {
    label: 'Sẵn sàng',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700',
    badgeClass: 'bg-white/90 text-emerald-700',
    activeTabClass:
      'data-[state=active]:border-emerald-200 data-[state=active]:bg-gradient-to-b data-[state=active]:from-emerald-50 data-[state=active]:to-[#e3f6ea] data-[state=active]:text-emerald-800',
    activeCountClass: 'group-data-[state=active]:bg-emerald-100 group-data-[state=active]:text-emerald-700',
  },
  RENTED: {
    label: 'Đang thuê',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700',
    badgeClass: 'bg-white/90 text-amber-700',
    activeTabClass:
      'data-[state=active]:border-amber-200 data-[state=active]:bg-gradient-to-b data-[state=active]:from-amber-50 data-[state=active]:to-[#fdf1d8] data-[state=active]:text-amber-800',
    activeCountClass: 'group-data-[state=active]:bg-amber-100 group-data-[state=active]:text-amber-700',
  },
  MAINTENANCE: {
    label: 'Bảo trì',
    dotClass: 'bg-red-500',
    textClass: 'text-red-700',
    badgeClass: 'bg-white/90 text-red-700',
    activeTabClass:
      'data-[state=active]:border-red-200 data-[state=active]:bg-gradient-to-b data-[state=active]:from-red-50 data-[state=active]:to-[#fde4e4] data-[state=active]:text-red-800',
    activeCountClass: 'group-data-[state=active]:bg-red-100 group-data-[state=active]:text-red-700',
  },
}
