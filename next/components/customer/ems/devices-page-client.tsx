"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { toast } from "sonner"

type CustomerUnitSummary = {
  id: string
  unitId: string
  status: string
  locationLabel: string | null
  lastSeenAt: string | null
  meterCount: number
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
  const router = useRouter()
  const [units, setUnits] = useState(initialUnits)
  const [hasRefreshError, setHasRefreshError] = useState(false)

  useEffect(() => {
    const topUnits = units.slice(0, 8)
    for (const unit of topUnits) {
      router.prefetch(`/devices/ems/${unit.unitId}/charts`)
      router.prefetch(`/devices/ems/${unit.unitId}/logs`)
      router.prefetch(`/devices/ems/${unit.unitId}/reports`)
    }
  }, [router, units])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch("/api/customer/ems", { cache: "no-store" })
        if (!response.ok) {
          if (!cancelled && !hasRefreshError) {
            setHasRefreshError(true)
            toast.error("Unable to refresh devices right now")
          }
          return
        }

        const data = (await response.json()) as {
          units?: CustomerUnitSummary[]
        }
        if (!cancelled) {
          setUnits(data.units ?? [])
          if (hasRefreshError) {
            setHasRefreshError(false)
            toast.success("Device list reconnected")
          }
        }
      } catch {
        if (!cancelled && !hasRefreshError) {
          setHasRefreshError(true)
          toast.error("Unable to refresh devices right now")
        }
      }
    }

    const interval = window.setInterval(() => {
      void load()
    }, 20_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [hasRefreshError])

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {units.map((unit) => (
        <motion.article
          key={unit.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="rounded-2xl bg-[#2b3242] p-[1px] shadow-[0_20px_30px_-20px_rgba(43,50,66,0.9)]"
        >
          <Link
            href={`/devices/ems/${unit.unitId}/charts`}
            className="card-glow block rounded-[15px] bg-card p-5 transition hover:translate-y-[-2px]"
          >
            <p className="text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              Unit
            </p>
            <p className="mt-2 text-lg font-semibold">{unit.unitId}</p>
            <div className="mt-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(unit.status)}`}
              >
                {unit.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {unit.locationLabel ?? "No location set"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Meters in latest snapshot: {unit.meterCount}
            </p>
          </Link>
        </motion.article>
      ))}
      {units.length === 0 ? (
        <article className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
          No EMS units are assigned to this customer.
        </article>
      ) : null}
    </section>
  )
}
