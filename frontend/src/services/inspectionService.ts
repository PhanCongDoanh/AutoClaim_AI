import type {
  CheckInRequest,
  CheckOutRequest,
  InspectionResponse,
  MessageResponse,
  OverrideDamageRequest,
  SessionResultResponse,
  UUID,
} from '../types'
import { apiClient, buildInspectionFormData } from './apiClient'

export const inspectionService = {
  async checkIn(request: CheckInRequest, images: File[]): Promise<InspectionResponse> {
    const { data } = await apiClient.post<InspectionResponse>(
      '/inspections/check-in',
      buildInspectionFormData(request, images),
    )
    return data
  },

  async checkOut(request: CheckOutRequest, images: File[]): Promise<InspectionResponse> {
    const { data } = await apiClient.post<InspectionResponse>(
      '/inspections/check-out',
      buildInspectionFormData(request, images),
    )
    return data
  },

  async getSessionResults(sessionId: UUID): Promise<SessionResultResponse> {
    const { data } = await apiClient.get<SessionResultResponse>(
      `/inspections/${sessionId}/results`,
    )
    return data
  },

  async overrideDamage(
    detectionId: UUID,
    request?: OverrideDamageRequest,
  ): Promise<MessageResponse> {
    const { data } = await apiClient.patch<MessageResponse>(
      `/inspections/damages/${detectionId}/override`,
      request,
    )
    return data
  },

  async completeInspection(sessionId: UUID): Promise<InspectionResponse> {
    const { data } = await apiClient.post<InspectionResponse>(
      `/inspections/${sessionId}/complete`,
    )
    return data
  },

  async downloadReport(sessionId: UUID): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(`/inspections/${sessionId}/report`, {
      responseType: 'blob',
    })
    return data
  },

  /** The backend redirects this URL to the stored image, so it can be used directly in `<img src>`. */
  getImageUrl(imageId: UUID): string {
    return `${apiClient.defaults.baseURL}/inspections/images/${imageId}`
  },
}
