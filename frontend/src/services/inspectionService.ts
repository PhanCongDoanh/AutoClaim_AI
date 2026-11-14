import type {
  AiProgress,
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

  /** Live AI progress of a CHECK_OUT session (falls back to the stored status, `live: false`). */
  async getAiProgress(sessionId: UUID): Promise<AiProgress> {
    const { data } = await axiosInstance.get<AiProgress>(`/inspections/${sessionId}/ai-progress`)
    return data
  },

  /** Re-runs AI detection for a FAILED (or stuck) session. 409 when the AI is still working or already DONE. */
  async retryAi(sessionId: UUID): Promise<AiProgress> {
    const { data } = await axiosInstance.post<AiProgress>(`/inspections/${sessionId}/ai-retry`)
    return data
  },

  async overrideDamage(
    detectionId: UUID,
    request: OverrideDamageRequest,
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
