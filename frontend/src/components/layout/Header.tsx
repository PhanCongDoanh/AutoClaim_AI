import { Bell, Menu, ScanSearch } from 'lucide-react'
import { Link } from 'react-router-dom'

interface HeaderProps {
  onToggleSidebar: () => void
}

// TODO: replace with the authenticated user once auth is wired up.
const currentUser = { name: 'Nguyen Van A', role: 'Staff' }

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function Header({ onToggleSidebar }: HeaderProps) {
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

        <Link to="/" className="flex items-center gap-2">
          {/* Logo placeholder */}
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <ScanSearch className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            AutoClaim <span className="text-brand-600">AI</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{currentUser.name}</p>
            <p className="text-xs text-slate-500">{currentUser.role}</p>
          </div>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
            aria-label={`${currentUser.name} avatar`}
          >
            {getInitials(currentUser.name)}
          </span>
        </div>
      </div>
    </header>
  )
}
