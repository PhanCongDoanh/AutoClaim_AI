import type { User } from '@/contexts/auth'
import { ROLE_NAME_VALUES, type RoleName } from '@/types'
import { axiosInstance } from '@/utils/axiosInstance'

interface LoginResponse {
  token: string
  roleName: RoleName
  email: string
  fullName: string
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    typeof data.token === 'string' &&
    data.token.length > 0 &&
    typeof data.email === 'string' &&
    typeof data.fullName === 'string' &&
    (ROLE_NAME_VALUES as readonly unknown[]).includes(data.roleName)
  )
}

export const authService = {
  async login(email: string, password: string): Promise<User> {
    try {
      const { data } = await axiosInstance.post<LoginResponse>('/auth/login', {
        email: email.trim(),
        password,
      })
      if (!isLoginResponse(data)) {
        throw new Error('Invalid credentials')
      }
      return {
        token: data.token,
        email: data.email,
        fullName: data.fullName,
        roleName: data.roleName,
      }
    } catch {
      throw new Error('Invalid credentials')
    }
  },
}
