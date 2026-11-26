import { Link, Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import { Toaster } from './components/ui/sonner'
import { AuthProvider } from './contexts/AuthContext'
import Login from './pages/Login'
import InspectionHistory from './pages/admin/InspectionHistory'
import InspectionHistoryDetail from './pages/admin/InspectionHistoryDetail'
import StaffManagement from './pages/admin/StaffManagement'
import Statistics from './pages/admin/Statistics'
import VehicleManagement from './pages/admin/VehicleManagement'
import CheckIn from './pages/staff/CheckIn'
import CheckOut from './pages/staff/CheckOut'
import Dashboard from './pages/staff/Dashboard'
import History from './pages/staff/History'
import HistoryDetail from './pages/staff/HistoryDetail'
import Maintenance from './pages/staff/Maintenance'

function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <p className="text-slate-600">Trang này không tồn tại.</p>
      <Link to="/login" className="text-sm font-medium text-brand-600 hover:underline">
        Về trang chính
      </Link>
    </div>
  )
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <Login /> },
  {
    path: '/staff',
    element: <ProtectedRoute allowedRoles={['STAFF']} />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'check-in', element: <CheckIn /> },
          { path: 'check-out', element: <CheckOut /> },
          { path: 'maintenance/:vehicleId', element: <Maintenance /> },
          { path: 'history', element: <History /> },
          { path: 'history/:checkOutSessionId', element: <HistoryDetail /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['ADMIN']} />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <Navigate to="vehicles" replace /> },
          { path: 'vehicles', element: <VehicleManagement /> },
          { path: 'staff', element: <StaffManagement /> },
          { path: 'history', element: <InspectionHistory /> },
          { path: 'history/:checkOutSessionId', element: <InspectionHistoryDetail /> },
          { path: 'statistics', element: <Statistics /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  { path: '/statistics', element: <Navigate to="/admin/statistics" replace /> },
  { path: '*', element: <NotFound /> },
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  )
}
