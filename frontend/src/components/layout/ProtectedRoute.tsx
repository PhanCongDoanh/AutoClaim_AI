import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ROLE_HOME_PATH, type Role } from '@/contexts/auth'
import { useAuth } from '@/hooks/useAuth'

export interface LoginLocationState {
  /** Page the user tried to open before being sent to /login. */
  from?: string
}

interface ProtectedRouteProps {
  allowedRoles: readonly Role[]
  /** Defaults to `<Outlet />` so it can wrap a group of child routes. */
  children?: ReactNode
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    const state: LoginLocationState = { from: `${location.pathname}${location.search}` }
    return <Navigate to="/login" replace state={state} />
  }

  if (!allowedRoles.includes(user.roleName)) {
    return <Navigate to={ROLE_HOME_PATH[user.roleName]} replace />
  }

  return children ?? <Outlet />
}
