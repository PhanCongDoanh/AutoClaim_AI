import { useState } from 'react'
import { Outlet, ScrollRestoration } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-full flex-col">
      <Header onToggleSidebar={() => setIsSidebarOpen((open) => !open)} />

      <div className="flex flex-1">
        <Sidebar isOpen={isSidebarOpen} onNavigate={() => setIsSidebarOpen(false)} />

        {isSidebarOpen && (
          <div
            className="fixed inset-0 top-16 z-10 bg-slate-900/30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="flex-1 overflow-x-hidden p-4 lg:p-8">
          <Outlet />
        </main>
        <ScrollRestoration />
      </div>
    </div>
  )
}
