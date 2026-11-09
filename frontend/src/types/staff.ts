import type { LocalDateTime, UUID } from './common'
import type { RoleName } from './enums'

/** Mirrors `StaffResponseDto`. */
export interface StaffResponse {
  userId: UUID
  fullName: string
  email: string
  phone: string | null
  roleName: RoleName | null
  createdAt: LocalDateTime
  updatedAt: LocalDateTime
}

/** Mirrors `CreateStaffRequest`. `roleName` defaults to STAFF on the backend. */
export interface CreateStaffRequest {
  fullName: string
  email: string
  phone?: string
  /** 6-72 characters; stored BCrypt-hashed. */
  password: string
  roleName?: RoleName
}

/** Mirrors `UpdateStaffRequest`. Email and password can't be changed through this endpoint. */
export interface UpdateStaffRequest {
  fullName: string
  phone?: string
  roleName?: RoleName
}
