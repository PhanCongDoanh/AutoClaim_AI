import type {
  CompleteMaintenanceRequest,
  UUID,
  VehicleQuery,
  VehicleResponse,
} from '../types'
import { axiosInstance } from '@/utils/axiosInstance'

export const vehicleService = {
  async getVehicles(query: VehicleQuery): Promise<VehicleResponse[]> {
    const { data } = await axiosInstance.get<VehicleResponse[]>('/vehicles', { params: query })
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
