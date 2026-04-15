import { DashboardMap, type DeviceMapData } from "@/components/admin/dashboard/dashboard-map"
import { getAdminEmsUnits } from "@/lib/ems/queries"

async function getDeviceData(): Promise<DeviceMapData[]> {
  const units = await getAdminEmsUnits()

  return units.map((unit) => ({
    id: unit.id,
    unit_id: unit.unitId,
    latitude: unit.latitude,
    longitude: unit.longitude,
    device_type: unit.deviceType,
    last_seen_at: unit.lastSeenAt ? new Date(unit.lastSeenAt) : null,
    status: unit.status.toLowerCase() === "online" ? "online" : "offline",
    customerName: unit.customerName,
    companyName: null,
    location_label: unit.locationLabel,
  }))
}

export const revalidate = 30

export default async function AdminDashboardPage() {
  const devices = await getDeviceData()

  const onlineCount = devices.filter(d => d.status === "online").length
  const healthPercent = devices.length > 0 ? Math.round((onlineCount / devices.length) * 100) : 0

  const uniqueCustomers = new Set(devices.filter(d => d.customerName).map(d => d.customerName)).size

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="shrink-0">
        <h1 className="mt-2 text-3xl font-semibold">Admin Dashboard</h1>
      </div>

      <section className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="card-glow panel-surface rounded-2xl p-6 flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Customers</p>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-4xl font-bold">{uniqueCustomers}</p>
            <p className="text-sm text-muted-foreground font-medium">Active in EMS</p>
          </div>
        </article>
        <article className="card-glow panel-surface rounded-2xl p-6 flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Connected Devices</p>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-4xl font-bold">{devices.length}</p>
            <p className="text-sm text-muted-foreground font-medium">{healthPercent}% returning heartbeat</p>
          </div>
        </article>
        <article className="card-glow panel-surface rounded-2xl p-6 flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Online Subsystems</p>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-4xl font-bold">{onlineCount}</p>
            <p className="text-sm text-muted-foreground font-medium">Currently reporting data</p>
          </div>
        </article>
      </section>

      <section className="flex min-h-0 flex-1 flex-col space-y-4">
        <div className="shrink-0">
          <h2 className="text-lg font-semibold">Device Geography</h2>
        </div>
        <DashboardMap devices={devices} />
      </section>
    </div>
  )
}
