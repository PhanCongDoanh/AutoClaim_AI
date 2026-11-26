import type { UUID } from './common'
import type { VehicleStatus } from './enums'

export interface StatisticsQuery {
  /** `YYYY-MM`, `all`, `last_3_months`, `last_6_months`, or omitted for all time. */
  month?: string
  vehicleId?: UUID | null
}

export interface StatisticsSummary {
  totalReturns: number
  damagedReturns: number
  cleanReturns: number
  damageRatePercent: number
  totalConfirmedDamages: number
  totalAiDetections: number
  rejectedAiCount: number
  aiAccuracyPercent: number
}

export interface MonthlyTrendItem {
  month: string
  monthLabel: string
  totalReturns: number
  cleanReturns: number
  damagedReturns: number
}

export interface DamageBreakdownItem {
  damageType: string
  damageLabel: string
  count: number
  percentage: number
}

export interface TopDamagedVehicleItem {
  vehicleId: UUID
  model: string
  licensePlate: string
  avatarUrl: string | null
  status: VehicleStatus
  damagedReturns: number
  totalConfirmedDamages: number
  mostCommonDamageType: string | null
  mostCommonPart: string | null
}

export interface StaffAiReviewStatItem {
  staffId: UUID | null
  staffName: string
  totalReturns: number
  totalAiDetections: number
  rejectedAiCount: number
  rejectionRatePercent: number
}

/** Exact response contract of `GET /api/v1/statistics`. */
export interface StatisticsResponse {
  summary: StatisticsSummary
  monthlyTrend: MonthlyTrendItem[]
  damageBreakdown: DamageBreakdownItem[]
  topDamagedVehicles: TopDamagedVehicleItem[]
  staffAiReviewStats: StaffAiReviewStatItem[]
}
