import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { authService } from '@/services/authService'
import { ROLE_NAME_VALUES } from '@/types'
import { AuthContext, type AuthContextValue, type User } from './auth'

export type { Role, User } from './auth'

/** v2 stores `fullName` / `roleName` (matching `StaffResponse`) instead of `name` / `role`. */
const STORAGE_KEY = 'autoclaim.user.v2'

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.email === 'string' &&
    typeof candidate.fullName === 'string' &&
    (ROLE_NAME_VALUES as readonly unknown[]).includes(candidate.roleName)
  )
}

/** "Remember me" keeps the session in localStorage; otherwise it ends with the browser tab. */
function readStoredUser(): User | null {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
      if (isUser(parsed)) return parsed
    } catch {
      storage.removeItem(STORAGE_KEY)
    }
  }
  return null
}

function clearStoredUser() {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser)

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const loggedIn = await authService.login(email, password)
    clearStoredUser()
    ;(remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(loggedIn))
    setUser(loggedIn)
    return loggedIn
  }, [])

  const logout = useCallback(() => {
    clearStoredUser()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
