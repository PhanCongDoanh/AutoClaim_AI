import { createContext } from 'react'
import type { RoleName } from '@/types'

export type Role = RoleName

export interface User {
  email: string
  role: Role
  /** Display name for the header. */
  name: string
}

export interface AuthContextValue {
  user: User | null
  /** Throws `Error('Invalid credentials')` when the email/password pair is unknown. */
  login: (email: string, password: string, remember: boolean) => Promise<User>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** Landing page for each role after login, or when hitting a route the role can't access. */
export const ROLE_HOME_PATH: Record<Role, string> = {
  ADMIN: '/admin',
  STAFF: '/staff',
}
