import type { LocalDateTime, UUID } from './common'
import type { RoleName } from './enums'

/** Mirrors `StaffResponseDto`. The display name is `name`, matching the JSON field. */
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
  /** 6-72 characters; stored BCrypt-hashed. */
  password: string
  roleName?: RoleName
}

/** Mirrors `UpdateStaffRequest`. Email and password can't be changed through this endpoint. */
export interface UpdateStaffRequest {
  name: string
  phone?: string
  roleName?: RoleName
}
