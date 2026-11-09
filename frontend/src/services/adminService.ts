import type {
  CreateStaffRequest,
  MessageResponse,
  StaffResponse,
  UpdateStaffRequest,
  UUID,
  VehicleFormData,
  VehicleResponse,
} from '../types'
import { axiosInstance } from '@/utils/axiosInstance'

/** Axios swaps this for `multipart/form-data; boundary=...` when the body is `FormData`. */
const MULTIPART_CONFIG = { headers: { 'Content-Type': 'multipart/form-data' } }

/** Spring binds these as `@RequestParam model/licensePlate/seats` + `@RequestPart("avatar")`. */
function toVehicleFormData({ model, licensePlate, seats, avatar }: VehicleFormData): FormData {
  const formData = new FormData()
  formData.append('model', model)
  formData.append('licensePlate', licensePlate)
  if (seats !== undefined) formData.append('seats', String(seats))
  if (avatar) formData.append('avatar', avatar, avatar.name)
  return formData
}

export const adminService = {
  async getVehicles(): Promise<VehicleResponse[]> {
    const { data } = await axiosInstance.get<VehicleResponse[]>('/admin/vehicles')
    return data
  },

  async createVehicle(vehicle: VehicleFormData): Promise<VehicleResponse> {
    const { data } = await axiosInstance.post<VehicleResponse>(
      '/admin/vehicles',
      toVehicleFormData(vehicle),
      MULTIPART_CONFIG,
    )
    return data
  },

  /** Omitting `avatar` keeps the current photo; the API has no way to remove one. */
  async updateVehicle(vehicleId: UUID, vehicle: VehicleFormData): Promise<VehicleResponse> {
    const { data } = await axiosInstance.put<VehicleResponse>(
      `/admin/vehicles/${vehicleId}`,
      toVehicleFormData(vehicle),
      MULTIPART_CONFIG,
    )
    return data
  },

  async deleteVehicle(vehicleId: UUID): Promise<MessageResponse> {
    const { data } = await axiosInstance.delete<MessageResponse>(`/admin/vehicles/${vehicleId}`)
    return data
  },

  async getStaff(): Promise<StaffResponse[]> {
    const { data } = await axiosInstance.get<StaffResponse[]>('/admin/staff')
    return data
  },

  async createStaff(request: CreateStaffRequest): Promise<StaffResponse> {
    const { data } = await axiosInstance.post<StaffResponse>('/admin/staff', request)
    return data
  },

  async updateStaff(staffId: UUID, request: UpdateStaffRequest): Promise<StaffResponse> {
    const { data } = await axiosInstance.put<StaffResponse>(`/admin/staff/${staffId}`, request)
    return data
  },

  async deleteStaff(staffId: UUID): Promise<MessageResponse> {
    const { data } = await axiosInstance.delete<MessageResponse>(`/admin/staff/${staffId}`)
    return data
  },
}
