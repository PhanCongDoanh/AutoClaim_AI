import type { StatisticsQuery, StatisticsResponse } from '@/types'
import { axiosInstance } from '@/utils/axiosInstance'

export const statisticsService = {
  /**
   * Fetches real aggregated inspection statistics from `GET /api/v1/statistics`.
   * Uses the shared authenticated `axiosInstance` with zero mock/fallback data.
   */
  async getStatistics(query: StatisticsQuery, signal?: AbortSignal): Promise<StatisticsResponse> {
    const { data } = await axiosInstance.get<StatisticsResponse>('/v1/statistics', {
      params: {
        ...(query.month ? { month: query.month } : {}),
        ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      },
      signal,
    })
    return data
  },
}
