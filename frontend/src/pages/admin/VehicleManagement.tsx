import { Car, Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { adminService } from '../../services/adminService'
import { getErrorMessage } from '../../services/apiClient'
import type { VehicleResponse, VehicleStatus } from '../../types'

const STATUS_BADGE: Record<VehicleStatus, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700',
  RENTED: 'bg-brand-50 text-brand-700',
  MAINTENANCE: 'bg-amber-50 text-amber-700',
}

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    adminService
      .getVehicles()
      .then((data) => {
        if (!ignore) setVehicles(data)
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Vehicle Management</h1>
          <p className="text-sm text-slate-500">Manage the rental fleet.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Add vehicle
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading vehicles…
          </div>
        ) : error ? (
          <p className="p-10 text-center text-sm text-red-600">{error}</p>
        ) : vehicles.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No vehicles yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">License plate</th>
                <th className="px-4 py-3">Seats</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.vehicleId} className="hover:bg-slate-50">
                  <td className="flex items-center gap-3 px-4 py-3">
                    {vehicle.avatarUrl ? (
                      <img
                        src={vehicle.avatarUrl}
                        alt={vehicle.model}
                        className="h-10 w-14 rounded object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-14 items-center justify-center rounded bg-slate-100 text-slate-400">
                        <Car className="h-5 w-5" />
                      </span>
                    )}
                    <span className="font-medium text-slate-900">{vehicle.model}</span>
                  </td>
                  <td className="px-4 py-3 font-mono">{vehicle.licensePlate}</td>
                  <td className="px-4 py-3">{vehicle.seats}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[vehicle.status]}`}
                    >
                      {vehicle.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
