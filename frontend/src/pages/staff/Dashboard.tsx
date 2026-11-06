import { Car, KeyRound, Wrench, type LucideIcon } from 'lucide-react'

interface StatCard {
  label: string
  value: string
  icon: LucideIcon
  accent: string
}

// Placeholder values; wire to `vehicleService.getVehicles` per status.
const STATS: StatCard[] = [
  { label: 'Available', value: '—', icon: Car, accent: 'bg-emerald-50 text-emerald-600' },
  { label: 'Rented', value: '—', icon: KeyRound, accent: 'bg-brand-50 text-brand-600' },
  { label: 'Maintenance', value: '—', icon: Wrench, accent: 'bg-amber-50 text-amber-600' },
]

export default function Dashboard() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Staff Dashboard</h1>
        <p className="text-sm text-slate-500">Fleet overview and today&apos;s inspections.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STATS.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-2xl font-semibold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
