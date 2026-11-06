import type {
  CompleteMaintenanceRequest,
  UUID,
  VehicleQuery,
  VehicleResponse,
} from '../types'
import { apiClient } from './apiClient'

export const vehicleService = {
  async getVehicles(query: VehicleQuery): Promise<VehicleResponse[]> {
    const { data } = await apiClient.get<VehicleResponse[]>('/vehicles', { params: query })
    return data
  },

  async completeMaintenance(
    vehicleId: UUID,
    request?: CompleteMaintenanceRequest,
  ): Promise<VehicleResponse> {
    const { data } = await apiClient.patch<VehicleResponse>(
      `/vehicles/${vehicleId}/complete-maintenance`,
      request,
    )
    return data
  },
}
