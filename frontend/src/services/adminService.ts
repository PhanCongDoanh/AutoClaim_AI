import type {
  CreateStaffRequest,
  MessageResponse,
  StaffResponse,
  UpdateStaffRequest,
  UUID,
  VehicleFormData,
  VehicleResponse,
} from '../types'
import { apiClient } from './apiClient'

function toVehicleFormData({ model, licensePlate, seats, avatar }: VehicleFormData): FormData {
  const formData = new FormData()
  formData.append('model', model)
  formData.append('licensePlate', licensePlate)
  if (seats !== undefined) formData.append('seats', String(seats))
  if (avatar) formData.append('avatar', avatar)
  return formData
}

export const adminService = {
  async getVehicles(): Promise<VehicleResponse[]> {
    const { data } = await apiClient.get<VehicleResponse[]>('/admin/vehicles')
    return data
  },

  async createVehicle(vehicle: VehicleFormData): Promise<VehicleResponse> {
    const { data } = await apiClient.post<VehicleResponse>(
      '/admin/vehicles',
      toVehicleFormData(vehicle),
    )
    return data
  },

  async updateVehicle(vehicleId: UUID, vehicle: VehicleFormData): Promise<VehicleResponse> {
    const { data } = await apiClient.put<VehicleResponse>(
      `/admin/vehicles/${vehicleId}`,
      toVehicleFormData(vehicle),
    )
    return data
  },

  async deleteVehicle(vehicleId: UUID): Promise<MessageResponse> {
    const { data } = await apiClient.delete<MessageResponse>(`/admin/vehicles/${vehicleId}`)
    return data
  },

  async getStaff(): Promise<StaffResponse[]> {
    const { data } = await apiClient.get<StaffResponse[]>('/admin/staff')
    return data
  },

  async createStaff(request: CreateStaffRequest): Promise<StaffResponse> {
    const { data } = await apiClient.post<StaffResponse>('/admin/staff', request)
    return data
  },

  async updateStaff(staffId: UUID, request: UpdateStaffRequest): Promise<StaffResponse> {
    const { data } = await apiClient.put<StaffResponse>(`/admin/staff/${staffId}`, request)
    return data
  },

  async deleteStaff(staffId: UUID): Promise<MessageResponse> {
    const { data } = await apiClient.delete<MessageResponse>(`/admin/staff/${staffId}`)
    return data
  },
}
