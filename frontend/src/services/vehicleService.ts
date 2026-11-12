import type {
  CompleteMaintenanceRequest,
  UUID,
  VehicleCounts,
  VehicleQuery,
  VehicleResponse,
} from '../types'
import { axiosInstance } from '@/utils/axiosInstance'

export const vehicleService = {
  async getVehicles(query: VehicleQuery): Promise<VehicleResponse[]> {
    const { data } = await axiosInstance.get<VehicleResponse[]>('/vehicles', { params: query })
    return data
  },

  /** Non-deleted vehicles per status, for the dashboard tab badges. */
  async getCounts(): Promise<VehicleCounts> {
    const { data } = await axiosInstance.get<VehicleCounts>('/vehicles/counts')
    return data
  },

  async completeMaintenance(
    vehicleId: UUID,
    request?: CompleteMaintenanceRequest,
  ): Promise<VehicleResponse> {
    const { data } = await axiosInstance.patch<VehicleResponse>(
      `/vehicles/${vehicleId}/complete-maintenance`,
      request,
    )
    return data
  },
}
