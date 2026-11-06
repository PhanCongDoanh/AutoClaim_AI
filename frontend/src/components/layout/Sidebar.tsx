import { Car, LayoutDashboard, LogIn, LogOut, Users, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Staff',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/check-in', label: 'Check-in', icon: LogIn },
      { to: '/check-out', label: 'Check-out', icon: LogOut },
    ],
  },
  {
    title: 'Admin',
    items: [
      { to: '/admin/vehicles', label: 'Vehicles', icon: Car },
      { to: '/admin/staff', label: 'Staff', icon: Users },
    ],
  },
]

interface SidebarProps {
  isOpen: boolean
  onNavigate: () => void
}

export default function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 top-16 z-20 w-64 transform border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <nav className="flex flex-col gap-6 p-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {section.title}
            </p>
            <ul className="flex flex-col gap-1">
              {section.items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
