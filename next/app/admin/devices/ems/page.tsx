import Link from "next/link"

import { getAdminEmsCustomersWithUnits, getAdminEmsUnitsFiltered } from "@/lib/ems/queries"

export const dynamic = "force-dynamic"

function getPageMeta({
  assignment,
  customerId,
  view,
}: {
  assignment: "all" | "assigned" | "unassigned"
  customerId?: number
  view?: "customers"
}) {
  if (view === "customers") {
    return {
      title: "EMS Customers",
      description: "Customers that currently own one or more EMS units.",
      refreshHref: "/admin/devices/ems?view=customers",
    }
  }

  if (typeof customerId === "number" && !Number.isNaN(customerId)) {
    return {
      title: "Customer EMS Units",
      description: "EMS units assigned to the selected customer.",
      refreshHref: `/admin/devices/ems?customerId=${customerId}`,
    }
  }

  if (assignment === "assigned") {
    return {
      title: "Assigned EMS Units",
      description: "EMS units currently assigned to customers.",
      refreshHref: "/admin/devices/ems?assignment=assigned",
    }
  }

  if (assignment === "unassigned") {
    return {
      title: "Unassigned EMS Units",
      description: "EMS units waiting to be assigned to a customer.",
      refreshHref: "/admin/devices/ems?assignment=unassigned",
    }
  }

  return {
    title: "EMS Units",
    description: "All discovered EMS units. Open a unit to assign it and manage metadata.",
    refreshHref: "/admin/devices/ems",
  }
}

export default async function AdminEmsPage({
  searchParams,
}: {
  searchParams?: Promise<{ assignment?: string; customerId?: string; view?: string }>
}) {
  const resolved = searchParams ? await searchParams : {}
  const assignment =
    resolved.assignment === "assigned" || resolved.assignment === "unassigned"
      ? resolved.assignment
      : "all"
  const view = resolved.view === "customers" ? "customers" : undefined
  const customerId = resolved.customerId ? Number(resolved.customerId) : undefined
  const validCustomerId = typeof customerId === "number" && !Number.isNaN(customerId) ? customerId : undefined
  const [units, customers] = await Promise.all([
    view === "customers"
      ? Promise.resolve([])
      : getAdminEmsUnitsFiltered({
          assignment,
          customerId: validCustomerId,
        }),
    getAdminEmsCustomersWithUnits(),
  ])
  const pageMeta = getPageMeta({ assignment, customerId: validCustomerId, view })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{pageMeta.title}</h1>
          <p className="text-sm text-muted-foreground">{pageMeta.description}</p>
        </div>
        <Link
          href={pageMeta.refreshHref}
          className="inline-flex h-10 items-center justify-center rounded-4xl border border-input bg-background px-4 text-sm font-medium transition hover:bg-muted"
        >
          Refresh
        </Link>
      </div>

      {view === "customers" ? (
        <section className="panel-surface overflow-hidden rounded-[24px]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/45 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="px-6 py-4 font-semibold">Customer ID</th>
                  <th className="px-6 py-4 font-semibold">Company / Client</th>
                  <th className="px-6 py-4 font-semibold text-center">Assigned Units</th>
                  <th className="px-6 py-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-white/70">
                {customers.map((customer) => (
                  <tr key={customer.customerId} className="transition-colors hover:bg-white/90">
                    <td className="px-6 py-4 font-medium text-primary">
                      #{customer.customerId}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">{customer.customerName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{customer.companyName}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {customer.unitCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/devices/ems?customerId=${customer.customerId}`}
                        className="inline-flex h-8 items-center rounded-lg border border-border/70 bg-white shadow-sm px-3 text-[11px] font-medium transition-colors hover:bg-muted"
                      >
                        View Units
                      </Link>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      No customers currently own EMS units.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="panel-surface overflow-hidden rounded-[24px]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/45 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="px-6 py-4 font-semibold">Unit ID</th>
                  <th className="px-6 py-4 font-semibold">Customer & Location</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-center">Meters</th>
                  <th className="px-6 py-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-white/70">
                {units.map((unit: (typeof units)[number]) => (
                  <tr key={unit.id} className="transition-colors hover:bg-white/90">
                    <td className="px-6 py-4 font-medium text-primary">
                      <div className="font-semibold">{unit.unitId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{unit.customerName ?? <span className="text-muted-foreground text-xs italic">Unassigned</span>}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{unit.locationLabel ?? "No location set"}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-xs">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: unit.status.toLowerCase() === 'online' ? '#22c55e' : '#ef4444' }} />
                        <span className={unit.status.toLowerCase() === 'online' ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                          {unit.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {unit.lastSeenAt ? new Date(unit.lastSeenAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "Never"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {unit.latestLog?.meterArray.length ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/devices/ems/${encodeURIComponent(unit.unitId)}`}
                        className="inline-flex h-8 items-center rounded-lg border border-border/70 bg-white shadow-sm px-3 text-[11px] font-medium transition-colors hover:bg-muted"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
                {units.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No EMS units match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
