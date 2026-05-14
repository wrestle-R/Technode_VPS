"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { Pencil, Save, X } from "lucide-react"
import { toast } from "sonner"

type CustomerUnitSummary = {
  id: string
  unitId: string
  displayName: string | null
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
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [savingUnitId, setSavingUnitId] = useState<string | null>(null)
  const [displayNameDrafts, setDisplayNameDrafts] = useState<Record<string, string>>({})

  function unitDisplayName(unit: CustomerUnitSummary) {
    return unit.displayName?.trim() || unit.unitId
  }

  async function saveDisplayName(unit: CustomerUnitSummary) {
    const draft = displayNameDrafts[unit.unitId] ?? unit.displayName ?? ""
    setSavingUnitId(unit.unitId)

    try {
      const response = await fetch(
        `/api/customer/ems/${encodeURIComponent(unit.unitId)}/display-name`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ displayName: draft }),
        }
      )
      const data = (await response.json()) as {
        error?: string
        displayName?: string | null
      }

      if (!response.ok) {
        toast.error(data.error ?? "Failed to update display name")
        return
      }

      setUnits((current) =>
        current.map((row) =>
          row.unitId === unit.unitId
            ? { ...row, displayName: data.displayName ?? null }
            : row
        )
      )
      setEditingUnitId(null)
      toast.success("Display name updated")
    } catch {
      toast.error("Failed to update display name")
    } finally {
      setSavingUnitId(null)
    }
  }

  useEffect(() => {
    const topUnits = units.slice(0, 8)
    for (const unit of topUnits) {
      router.prefetch(`/devices/ems/${unit.unitId}`)
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
          <div className="card-glow rounded-[15px] bg-card p-5 transition hover:translate-y-[-2px]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                  Unit
                </p>
                {editingUnitId === unit.unitId ? (
                  <input
                    className="mt-2 h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm"
                    value={displayNameDrafts[unit.unitId] ?? unit.displayName ?? ""}
                    onChange={(event) =>
                      setDisplayNameDrafts((current) => ({
                        ...current,
                        [unit.unitId]: event.target.value,
                      }))
                    }
                    placeholder={unit.unitId}
                  />
                ) : (
                  <p className="mt-2 truncate text-lg font-semibold">
                    {unitDisplayName(unit)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                {editingUnitId === unit.unitId ? (
                  <>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-input text-muted-foreground transition hover:bg-muted"
                      onClick={() => {
                        setEditingUnitId(null)
                      }}
                      aria-label="Cancel display name edit"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-input text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                      onClick={() => {
                        void saveDisplayName(unit)
                      }}
                      disabled={savingUnitId === unit.unitId}
                      aria-label="Save display name"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-input text-muted-foreground transition hover:bg-muted"
                    onClick={() => {
                      setDisplayNameDrafts((current) => ({
                        ...current,
                        [unit.unitId]: unit.displayName ?? "",
                      }))
                      setEditingUnitId(unit.unitId)
                    }}
                    aria-label="Edit display name"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

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
            <div className="mt-3">
              <Link
                href={`/devices/ems/${unit.unitId}`}
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                View Details
              </Link>
            </div>
          </div>
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
