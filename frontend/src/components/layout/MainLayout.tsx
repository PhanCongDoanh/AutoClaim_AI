import { Outlet, ScrollRestoration } from 'react-router-dom'
import Header from './Header'
import { PageBackdrop } from './PageBackdrop'

export default function MainLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <div className="relative isolate flex-1">
        <PageBackdrop />
        {/* `overflow-x-clip` (not hidden) so `position: sticky` descendants still stick to the viewport. */}
        <main className="mx-auto w-full max-w-[1340px] overflow-x-clip px-4 py-6 sm:px-6 lg:px-12 lg:py-8">
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
    </div>
  )
}
