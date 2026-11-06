import type { LocalDateTime, UUID } from './common'
import type { RoleName } from './enums'

/** Mirrors `StaffResponseDto`. */
export interface StaffResponse {
  userId: UUID
  name: string
  email: string
  phone: string | null
  roleName: RoleName | null
  createdAt: LocalDateTime
  updatedAt: LocalDateTime
}

/** Mirrors `CreateStaffRequest`. `roleName` defaults to STAFF on the backend. */
export interface CreateStaffRequest {
  name: string
  email: string
  phone?: string
  roleName?: RoleName
}

/** Mirrors `UpdateStaffRequest`. */
export interface UpdateStaffRequest {
  name: string
  phone?: string
  roleName?: RoleName
}
