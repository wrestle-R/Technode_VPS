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
    description: "All discovered EMS units. Open a unit to assign it and manage slave mappings.",
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
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => (
            <Link
              href={`/admin/devices/ems?customerId=${customer.customerId}`}
              key={customer.customerId}
              className="card-glow rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/40"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Customer</p>
              <p className="mt-1 text-xl font-semibold">{customer.companyName}</p>
              <p className="mt-1 text-sm text-muted-foreground">{customer.customerName}</p>
              <p className="mt-3 text-sm text-muted-foreground">Customer ID: {customer.customerId}</p>
              <p className="mt-1 text-sm font-medium">Assigned EMS units: {customer.unitCount}</p>
            </Link>
          ))}
          {customers.length === 0 ? (
            <article className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
              No customers currently own EMS units.
            </article>
          ) : null}
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {units.map((unit: (typeof units)[number]) => (
            <Link
              href={`/admin/devices/ems/${encodeURIComponent(unit.unitId)}`}
              className="card-glow rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/40"
              key={unit.id}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Unit ID</p>
              <p className="mt-1 text-xl font-semibold">{unit.unitId}</p>
              <p className="mt-3 text-sm text-muted-foreground">{unit.locationLabel ?? "No location set"}</p>
              <p className="mt-1 text-sm font-medium">Status: {unit.status}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Customer: {unit.customerName ?? "Unassigned"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last seen: {unit.lastSeenAt ? new Date(unit.lastSeenAt).toLocaleString() : "Never"}
              </p>
              <p className="mt-3 text-sm font-medium">
                Slaves in latest snapshot: {unit.latestLog?.mappedRtuArray.length ?? 0}
              </p>
            </Link>
          ))}
          {units.length === 0 ? (
            <article className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
              No EMS units match the current filter.
            </article>
          ) : null}
        </section>
      )}
    </div>
  )
}
