import { getCustomerSessionFromCookies } from "@/lib/auth"
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
  const totalSlaves = units.reduce((sum, unit) => sum + unit.slaveCount, 0)
  const latestSeen = units
    .map((unit) => unit.lastSeenAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .reverse()[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live EMS summary for the units assigned to this customer.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="card-glow rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.11em] text-muted-foreground uppercase">
            Assigned Units
          </p>
          <p className="mt-2 text-2xl font-semibold">{units.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {onlineUnits.length} units currently online
          </p>
        </article>
        <article className="card-glow rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.11em] text-muted-foreground uppercase">
            Visible Slaves
          </p>
          <p className="mt-2 text-2xl font-semibold">{totalSlaves}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Across the latest snapshots for assigned units
          </p>
        </article>
        <article className="card-glow rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.11em] text-muted-foreground uppercase">
            Latest Update
          </p>
          <p className="mt-2 text-lg font-semibold">
            {latestSeen ? new Date(latestSeen).toLocaleString() : "No data yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Most recent EMS snapshot received for this customer
          </p>
        </article>
      </section>
    </div>
  )
}
