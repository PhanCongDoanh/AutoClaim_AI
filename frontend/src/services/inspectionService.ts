import type {
  CheckInRequest,
  CheckOutRequest,
  InspectionResponse,
  MessageResponse,
  OverrideDamageRequest,
  SessionResultResponse,
  UUID,
} from '../types'
import { axiosInstance } from '@/utils/axiosInstance'
import { buildInspectionFormData } from './apiClient'

export const inspectionService = {
  async checkIn(request: CheckInRequest, images: File[]): Promise<InspectionResponse> {
    const { data } = await axiosInstance.post<InspectionResponse>(
      '/inspections/check-in',
      buildInspectionFormData(request, images),
    )
    return data
  },

  async checkOut(request: CheckOutRequest, images: File[]): Promise<InspectionResponse> {
    const { data } = await axiosInstance.post<InspectionResponse>(
      '/inspections/check-out',
      buildInspectionFormData(request, images),
    )
    return data
  },

  async getSessionResults(sessionId: UUID): Promise<SessionResultResponse> {
    const { data } = await axiosInstance.get<SessionResultResponse>(
      `/inspections/${sessionId}/results`,
    )
    return data
  },

  async overrideDamage(
    detectionId: UUID,
    request?: OverrideDamageRequest,
  ): Promise<MessageResponse> {
    const { data } = await axiosInstance.patch<MessageResponse>(
      `/inspections/damages/${detectionId}/override`,
      request,
    )
    return data
  },

  async completeInspection(sessionId: UUID): Promise<InspectionResponse> {
    const { data } = await axiosInstance.post<InspectionResponse>(
      `/inspections/${sessionId}/complete`,
    )
    return data
  },

  async downloadReport(sessionId: UUID): Promise<Blob> {
    const { data } = await axiosInstance.get<Blob>(`/inspections/${sessionId}/report`, {
      responseType: 'blob',
    })
    return data
  },

  /** The backend redirects this URL to the stored image, so it can be used directly in `<img src>`. */
  getImageUrl(imageId: UUID): string {
    return `${axiosInstance.defaults.baseURL}/inspections/images/${imageId}`
  },
}
