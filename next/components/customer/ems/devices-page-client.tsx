"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type CustomerUnitSummary = {
  id: string
  unitId: string
  status: string
  locationLabel: string | null
  lastSeenAt: string | null
  slaveCount: number
}

function statusClasses(status: string) {
  return status.toLowerCase() === "online"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700"
}

export function CustomerDevicesPageClient({
  initialUnits,
}: {
  initialUnits: CustomerUnitSummary[]
}) {
  const [units, setUnits] = useState(initialUnits)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch("/api/customer/ems", { cache: "no-store" })
        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { units?: CustomerUnitSummary[] }
        if (!cancelled) {
          setUnits(data.units ?? [])
        }
      } catch {
        // keep last good data
      }
    }

    const interval = window.setInterval(() => {
      void load()
    }, 20_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {units.map((unit) => (
        <Link
          href={`/devices/ems/${unit.unitId}/overview`}
          key={unit.id}
          className="card-glow rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/40"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Unit</p>
          <p className="mt-2 text-lg font-semibold">{unit.unitId}</p>
          <div className="mt-3">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(unit.status)}`}>
              {unit.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{unit.locationLabel ?? "No location set"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Slaves in latest snapshot: {unit.slaveCount}</p>
        </Link>
      ))}
      {units.length === 0 ? (
        <article className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
          No EMS units are assigned to this customer.
        </article>
      ) : null}
    </section>
  )
}
