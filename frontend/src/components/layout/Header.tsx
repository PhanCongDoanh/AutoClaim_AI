import {
  Bell,
  Car,
  ChevronDown,
  History,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
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
  /** Shown in the nav but not navigable yet (no route). */
  disabled?: boolean
}

const NAV_ITEMS_BY_ROLE: Record<Role, NavItem[]> = {
  STAFF: [
    { to: '/staff', label: 'Danh sách xe', icon: Car, end: true },
    { to: '/staff/check-in', label: 'Check-in', icon: LogIn },
    { to: '/staff/check-out', label: 'Check-out', icon: LogOut },
    { to: '/staff/history', label: 'Lịch sử kiểm định', icon: History, disabled: true },
  ],
  ADMIN: [
    { to: '/admin/vehicles', label: 'Quản lý xe', icon: Car },
    { to: '/admin/staff', label: 'Nhân viên', icon: Users },
  ],
}

const AVATAR_COLORS: Record<Role, string> = {
  ADMIN: 'bg-gradient-to-br from-violet-500 to-purple-700',
  STAFF: 'bg-gradient-to-b from-[#3b7bf6] to-[#1d4fd8]',
}

const DESKTOP_TAB_BASE =
  'group relative inline-flex h-full items-center whitespace-nowrap px-1 text-[15px] font-semibold transition-colors'

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
    <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 shadow-[0_8px_24px_-18px_rgba(30,64,175,0.35)] backdrop-blur-xl">
      <div className="flex h-[68px] items-center justify-between gap-4 px-4 lg:px-8">
        <div className="flex h-full items-center gap-6 xl:gap-8">
          <Link to={user ? ROLE_HOME_PATH[user.roleName] : '/login'} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#3b7bf6] to-[#1d4fd8] text-white shadow-[0_6px_14px_-6px_rgba(37,99,235,0.7)]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-[17px] font-bold tracking-tight text-slate-900">AutoClaim AI</span>
              <span className="block whitespace-nowrap text-[11px] font-medium text-slate-500">Hệ thống kiểm định xe</span>
            </span>
          </Link>

          <nav className="hidden h-full items-stretch gap-1 lg:flex" aria-label="Điều hướng chính">
            {navItems.map(({ to, label, icon: Icon, end, disabled }) =>
              disabled ? (
                <span
                  key={to}
                  className={cn(DESKTOP_TAB_BASE, 'cursor-not-allowed text-slate-700/80')}
                  title="Sắp ra mắt"
                  aria-disabled="true"
                >
                  <span className="inline-flex h-10 items-center gap-2 rounded-xl px-3.5">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
                    {label}
                  </span>
                </span>
              ) : (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(DESKTOP_TAB_BASE, isActive ? 'text-brand-600' : 'text-slate-800 hover:text-brand-600')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'inline-flex h-10 items-center gap-2 rounded-xl px-3.5 transition-colors',
                          isActive ? 'bg-[#e4edfd]' : 'group-hover:bg-slate-100/80',
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
                        {label}
                      </span>
                      <span
                        className={cn(
                          'absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-brand-600 transition-opacity',
                          isActive ? 'opacity-100' : 'opacity-0',
                        )}
                        aria-hidden="true"
                      />
                    </>
                  )}
                </NavLink>
              ),
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.25)] ring-1 ring-slate-100 transition-colors hover:bg-slate-50"
            aria-label="Thông báo"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold text-white shadow-[0_4px_12px_-4px_rgba(37,99,235,0.6)]',
                    AVATAR_COLORS[user.roleName],
                  )}
                  aria-hidden="true"
                >
                  {getInitials(user.fullName)}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block whitespace-nowrap text-sm font-bold text-slate-900">{user.fullName}</span>
                  <span className="block text-xs text-slate-500">{ROLE_LABELS[user.roleName]}</span>
                </span>
                <ChevronDown className="ml-1 hidden h-4 w-4 text-slate-700 sm:block" strokeWidth={2.5} />
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
        <nav className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 lg:hidden" aria-label="Điều hướng chính">
          {navItems.map(({ to, label, icon: Icon, end, disabled }) =>
            disabled ? (
              <span
                key={to}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400"
                aria-disabled="true"
              >
                <Icon className="h-4 w-4" />
                {label}
              </span>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setIsMobileNavOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold',
                    isActive ? 'bg-[#e4edfd] text-brand-600' : 'text-slate-700 hover:bg-slate-100',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ),
          )}
        </nav>
      )}
    </header>
  )
}
