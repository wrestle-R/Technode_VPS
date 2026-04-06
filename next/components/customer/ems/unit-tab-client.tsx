"use client"

import { useEffect, useMemo, useState } from "react"

type MetricValue = {
  key: string
  label: string
  order: number
  value: number | null
}

type RtuEntry = {
  rtuKey: string
  id: number | null
  slave: string | null
  nickname: string
  res: string | null
  datalen: number
  metrics: MetricValue[]
}

type UnitLog = {
  id: string
  deviceTimestamp: string
  status: string
  rtus: RtuEntry[]
}

type CustomerUnitDetail = {
  id: string
  unitId: string
  status: string
  locationLabel: string | null
  latitude: number | null
  longitude: number | null
  deviceType: string | null
  lastSeenAt: string | null
  latestRtus: RtuEntry[]
  logs: UnitLog[]
}

function statusClasses(status: string) {
  return status.toLowerCase() === "online"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700"
}

export function CustomerUnitTabClient({
  initialUnit,
  tab,
}: {
  initialUnit: CustomerUnitDetail
  tab: string
}) {
  const [unit, setUnit] = useState(initialUnit)
  const [selectedRtuKey, setSelectedRtuKey] = useState(initialUnit.latestRtus[0]?.rtuKey ?? "")

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch(`/api/customer/ems/${encodeURIComponent(initialUnit.unitId)}`, {
          cache: "no-store",
        })
        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { unit?: CustomerUnitDetail }
        const nextUnit = data.unit
        if (!cancelled && nextUnit) {
          setUnit(nextUnit)
          setSelectedRtuKey((current) => current || nextUnit.latestRtus[0]?.rtuKey || "")
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
  }, [initialUnit.unitId])

  const availableRtus = useMemo(() => {
    const map = new Map<string, { rtuKey: string; nickname: string }>()

    for (const rtu of unit.latestRtus) {
      map.set(rtu.rtuKey, {
        rtuKey: rtu.rtuKey,
        nickname: rtu.nickname,
      })
    }

    for (const log of unit.logs) {
      for (const rtu of log.rtus) {
        if (!map.has(rtu.rtuKey)) {
          map.set(rtu.rtuKey, {
            rtuKey: rtu.rtuKey,
            nickname: rtu.nickname,
          })
        }
      }
    }

    return Array.from(map.values())
  }, [unit])

  const effectiveRtuKey = selectedRtuKey || availableRtus[0]?.rtuKey || ""

  const selectedLogRows = useMemo(() => {
    return unit.logs
      .map((log) => {
        const rtu = log.rtus.find((entry) => entry.rtuKey === effectiveRtuKey)
        if (!rtu) {
          return null
        }

        return {
          id: log.id,
          deviceTimestamp: log.deviceTimestamp,
          metrics: rtu.metrics,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  }, [effectiveRtuKey, unit.logs])

  const metricColumns = useMemo(() => {
    const map = new Map<string, { key: string; label: string; order: number }>()

    for (const row of selectedLogRows) {
      for (const metric of row.metrics) {
        if (!map.has(metric.key)) {
          map.set(metric.key, {
            key: metric.key,
            label: metric.label,
            order: metric.order,
          })
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.order - b.order)
  }, [selectedLogRows])

  if (tab === "charts") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{unit.unitId}</h1>
          <p className="text-sm text-muted-foreground">Charts are reserved for a later EMS release.</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm text-sm text-muted-foreground">
          Current implementation focuses on MQTT ingestion, meter mapping, overview tables, and log history.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{unit.unitId}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(unit.status)}`}>
            {unit.status}
          </span>
          <p className="text-sm text-muted-foreground">
            Last seen: {unit.lastSeenAt ? new Date(unit.lastSeenAt).toLocaleString() : "Never"}
          </p>
        </div>
      </div>

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Location</p>
              <p className="mt-2 text-lg font-semibold">{unit.locationLabel ?? "-"}</p>
            </article>
            <article className="rounded-2xl border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Device Type</p>
              <p className="mt-2 text-lg font-semibold">{unit.deviceType ?? "-"}</p>
            </article>
            <article className="rounded-2xl border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Meters</p>
              <p className="mt-2 text-lg font-semibold">{unit.latestRtus.length}</p>
            </article>
          </div>

          {unit.latestRtus.map((rtu) => (
            <article key={rtu.rtuKey} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{rtu.nickname}</h2>
                  <p className="text-sm text-muted-foreground">{rtu.slave ?? rtu.rtuKey}</p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Metric</th>
                      <th className="px-3 py-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rtu.metrics.map((metric) => (
                      <tr key={`${rtu.rtuKey}-${metric.key}`} className="border-t">
                        <td className="px-3 py-2">{metric.label}</td>
                        <td className="px-3 py-2 font-mono">{metric.value ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <label className="grid gap-2 text-sm sm:max-w-xs">
              <span className="font-medium">Meter</span>
              <select
                className="h-10 rounded-xl border border-input bg-background px-3"
                value={effectiveRtuKey}
                onChange={(event) => setSelectedRtuKey(event.target.value)}
              >
                {availableRtus.map((rtu) => (
                  <option key={rtu.rtuKey} value={rtu.rtuKey}>
                    {rtu.nickname}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                  {metricColumns.map((metric) => (
                    <th key={metric.key} className="px-4 py-3 text-left font-medium">
                      {metric.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {selectedLogRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{new Date(row.deviceTimestamp).toLocaleString()}</td>
                    {metricColumns.map((metric) => {
                      const value = row.metrics.find((entry) => entry.key === metric.key)?.value
                      return (
                        <td key={`${row.id}-${metric.key}`} className="px-4 py-3 font-mono">
                          {value ?? "-"}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {selectedLogRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-muted-foreground" colSpan={Math.max(metricColumns.length + 1, 2)}>
                      No logs available for the selected meter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
