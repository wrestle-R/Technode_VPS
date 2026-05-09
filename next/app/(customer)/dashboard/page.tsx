import { getCustomerSessionFromCookies } from "@/lib/auth"
import { CustomerDashboardMap, type CustomerDeviceMapData } from "@/components/customer/dashboard/customer-dashboard-map"
import { getCustomerEmsUnits } from "@/lib/ems/queries"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function CustomerDashboardPage() {
  const session = await getCustomerSessionFromCookies()
  if (!session) {
    redirect("/login")
  }

  const units = await getCustomerEmsUnits(session.customerId)
  const onlineUnits = units.filter(
    (unit) => unit.status.toLowerCase() === "online"
  )
  const totalMeters = units.reduce((sum, unit) => sum + unit.meterCount, 0)
  const connectedDevices = units.filter(
    (unit) => unit.latitude !== null && unit.longitude !== null
  ).length
  const mapDevices: CustomerDeviceMapData[] = units.map((unit) => ({
    id: unit.id,
    unitId: unit.unitId,
    latitude: unit.latitude,
    longitude: unit.longitude,
    deviceType: unit.deviceType,
    lastSeenAt: unit.lastSeenAt,
    status: unit.status,
    locationLabel: unit.locationLabel,
  }))

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="shrink-0">
        <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
      </div>

      <section className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="card-glow panel-surface rounded-2xl p-6 flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Assigned Units
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-4xl font-bold">{units.length}</p>
            <p className="text-sm text-muted-foreground font-medium">Mapped to this account</p>
          </div>
        </article>
        <article className="card-glow panel-surface rounded-2xl p-6 flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Connected Devices
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-4xl font-bold">{connectedDevices}</p>
            <p className="text-sm text-muted-foreground font-medium">Pinned on India map, {totalMeters} visible meters</p>
          </div>
        </article>
        <article className="card-glow panel-surface rounded-2xl p-6 flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Online Subsystems</p>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-4xl font-bold">{onlineUnits.length}</p>
            <p className="text-sm text-muted-foreground font-medium">Currently reporting data</p>
          </div>
        </article>
      </section>

      <section className="flex min-h-0 flex-1 flex-col space-y-4">
        <div className="shrink-0">
          <h2 className="text-lg font-semibold">Device Geography</h2>
          <p className="text-sm text-muted-foreground">
            {onlineUnits.length} units currently online
          </p>
        </div>
        <CustomerDashboardMap devices={mapDevices} />
      </section>
    </div>
  )
}
