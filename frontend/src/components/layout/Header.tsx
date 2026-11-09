import { Bell, Car, ChevronDown, LogIn, LogOut, Menu, ShieldCheck, Users, X, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLE_HOME_PATH, type Role } from '@/contexts/auth'
import { useAuth } from '@/hooks/useAuth'
import { getInitials, ROLE_LABELS } from '@/lib/people'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Only active on an exact match (index routes). */
  end?: boolean
}

const NAV_ITEMS_BY_ROLE: Record<Role, NavItem[]> = {
  STAFF: [
    { to: '/staff', label: 'Danh sách xe', icon: Car, end: true },
    { to: '/staff/check-in', label: 'Check-in', icon: LogIn },
    { to: '/staff/check-out', label: 'Check-out', icon: LogOut },
  ],
  ADMIN: [
    { to: '/admin/vehicles', label: 'Quản lý xe', icon: Car },
    { to: '/admin/staff', label: 'Nhân viên', icon: Users },
  ],
}

const AVATAR_COLORS: Record<Role, string> = {
  ADMIN: 'bg-violet-600',
  STAFF: 'bg-brand-600',
}

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const navItems = user ? NAV_ITEMS_BY_ROLE[user.roleName] : []

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex h-full items-center gap-8">
          <Link to={user ? ROLE_HOME_PATH[user.roleName] : '/login'} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-semibold tracking-tight text-slate-900">AutoClaim AI</span>
              <span className="block whitespace-nowrap text-xs text-slate-500">Hệ thống kiểm định xe</span>
            </span>
          </Link>

          <nav className="hidden h-full items-stretch gap-1 lg:flex" aria-label="Điều hướng chính">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Thông báo"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
          </button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full border border-slate-200 py-1 pl-1 pr-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white',
                    AVATAR_COLORS[user.roleName],
                  )}
                  aria-hidden="true"
                >
                  {getInitials(user.fullName)}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block whitespace-nowrap text-sm font-medium text-slate-900">{user.fullName}</span>
                  <span className="block text-xs text-slate-500">{ROLE_LABELS[user.roleName]}</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <span className="block font-medium">{user.fullName}</span>
                  <span className="block text-xs text-muted-foreground">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                  <LogOut />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {navItems.length > 0 && (
            <button
              type="button"
              onClick={() => setIsMobileNavOpen((open) => !open)}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label={isMobileNavOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={isMobileNavOpen}
            >
              {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {isMobileNavOpen && (
        <nav className="flex flex-col gap-1 border-t px-4 py-3 lg:hidden" aria-label="Điều hướng chính">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setIsMobileNavOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
