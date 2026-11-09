import { Outlet, ScrollRestoration } from 'react-router-dom'
import Header from './Header'

export default function MainLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden p-4 lg:p-8">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  )
}
