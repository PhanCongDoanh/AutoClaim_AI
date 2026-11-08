import { Bell, LogOut, Menu, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ROLE_HOME_PATH, type Role } from '@/contexts/auth'
import { useAuth } from '@/hooks/useAuth'

interface HeaderProps {
  onToggleSidebar: () => void
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to={user ? ROLE_HOME_PATH[user.role] : '/login'} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-semibold tracking-tight text-slate-900">AutoClaim AI</span>
            <span className="block text-xs text-slate-500">Hệ thống kiểm định xe</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Thông báo"
        >
          <Bell className="h-5 w-5" />
        </button>

        {user && (
          <>
            <div className="flex items-center gap-3 rounded-full border border-slate-200 py-1 pl-1 pr-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white"
                aria-hidden="true"
              >
                {getInitials(user.name)}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Đăng xuất" title="Đăng xuất">
              <LogOut />
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
