import { Link, RouterProvider, createBrowserRouter } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import StaffManagement from './pages/admin/StaffManagement'
import VehicleManagement from './pages/admin/VehicleManagement'
import CheckIn from './pages/staff/CheckIn'
import CheckOut from './pages/staff/CheckOut'
import Dashboard from './pages/staff/Dashboard'

function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <p className="text-slate-600">This page does not exist.</p>
      <Link to="/" className="text-sm font-medium text-brand-600 hover:underline">
        Back to dashboard
      </Link>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'check-in', element: <CheckIn /> },
      { path: 'check-out', element: <CheckOut /> },
      {
        path: 'admin',
        children: [
          { path: 'vehicles', element: <VehicleManagement /> },
          { path: 'staff', element: <StaffManagement /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
