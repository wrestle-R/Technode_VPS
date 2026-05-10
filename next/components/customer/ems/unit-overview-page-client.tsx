"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Pencil, Save } from "lucide-react"
import { toast } from "sonner"

import { formatNumber } from "@/components/customer/ems/helpers"
import type { CustomerUnitDetail, MeterEntry, MetricValue, UnitLog } from "@/components/customer/ems/types"
import { useIsMobile } from "@/hooks/use-mobile"

type MeterRow = {
  meterKey: string
  name: string
  label: string | null
  voltage: number | null
  amperage: number | null
  power: number | null
}

const seriesColors = ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"]

function metricByAliases(metrics: MetricValue[], aliases: string[]) {
  for (const metric of metrics) {
    const key = metric.key.toLowerCase()
    if (aliases.some((alias) => key.includes(alias))) {
      return metric.value
    }
  }
  return null
}

function meterMetricByAliases(meter: MeterEntry, aliases: string[]) {
  return metricByAliases(meter.metrics, aliases)
}

function meterFromLog(log: UnitLog, meterKey: string) {
  return log.meters.find((meter) => meter.meterKey === meterKey) ?? null
}

function buildMeterRows(
  unit: CustomerUnitDetail,
  labelOverrides: Record<string, string | null>
): MeterRow[] {
  return unit.latestMeters.map((meter) => {
    const voltage = meterMetricByAliases(meter, ["voltage", "vll", "vr", "vy", "vb", "volt"])
    const amperage = meterMetricByAliases(meter, ["current", "amp", "ir", "iy", "ib"])
    const power = meterMetricByAliases(meter, ["kw", "power", "watt", "totalkw"])

    return {
      meterKey: meter.meterKey,
      name: meter.name,
      label: labelOverrides[meter.meterKey] ?? meter.label ?? null,
      voltage,
      amperage,
      power,
    }
  })
}

function buildVoltageTrend(unit: CustomerUnitDetail, rows: MeterRow[]) {
  const logs = unit.logs.slice(0, 24).reverse()
  return logs.map((log, index) => {
    const row: Record<string, string | number | null> = {
      label: new Date(log.deviceTimestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      idx: index,
    }

    for (const meter of rows) {
      const entry = meterFromLog(log, meter.meterKey)
      row[meter.meterKey] = entry
        ? metricByAliases(entry.metrics, ["voltage", "vll", "vr", "vy", "vb", "volt"])
        : null
    }

    return row
  })
}

function buildAmpTrend(unit: CustomerUnitDetail, rows: MeterRow[]) {
  const logs = unit.logs.slice(0, 24).reverse()
  return logs.map((log, index) => {
    const row: Record<string, string | number | null> = {
      label: new Date(log.deviceTimestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      idx: index,
    }

    for (const meter of rows) {
      const entry = meterFromLog(log, meter.meterKey)
      row[meter.meterKey] = entry
        ? metricByAliases(entry.metrics, ["current", "amp", "ir", "iy", "ib"])
        : null
    }

    return row
  })
}

function buildEnergyBars(unit: CustomerUnitDetail, rows: MeterRow[]) {
  const logs = unit.logs.slice(0, 10).reverse()
  return logs.map((log) => {
    const row: Record<string, string | number | null> = {
      label: new Date(log.deviceTimestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }

    for (const meter of rows) {
      const entry = meterFromLog(log, meter.meterKey)
      const power = entry
        ? metricByAliases(entry.metrics, ["kw", "power", "watt", "totalkw"])
        : null
      row[meter.meterKey] = power == null ? null : Math.max(power / 1000, 0)
    }

    return row
  })
}

function buildEnergyCurves(unit: CustomerUnitDetail, rows: MeterRow[]) {
  const curveMeters = rows.slice(0, 2)
  const logs = unit.logs.slice(0, 30).reverse()

  return logs.map((log) => {
    const point: Record<string, string | number | null> = {
      label: new Date(log.deviceTimestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      total: 0,
    }

    for (const meter of curveMeters) {
      const entry = meterFromLog(log, meter.meterKey)
      const power =
        entry != null
          ? metricByAliases(entry.metrics, ["kw", "power", "watt", "totalkw"])
          : null
      point[meter.meterKey] = power
      point.total = (point.total as number) + (power ?? 0)
    }

    return point
  })
}

export function UnitOverviewPageClient({ unit }: { unit: CustomerUnitDetail }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [meterLabels, setMeterLabels] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {}
    for (const meter of unit.latestMeters) {
      map[meter.meterKey] = meter.label ?? null
    }
    return map
  })
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({})
  const [editingMeterKey, setEditingMeterKey] = useState<string | null>(null)
  const [savingMeterKey, setSavingMeterKey] = useState<string | null>(null)

  const rows = useMemo(() => buildMeterRows(unit, meterLabels), [meterLabels, unit])

  const voltageTrend = useMemo(() => buildVoltageTrend(unit, rows), [unit, rows])
  const ampTrend = useMemo(() => buildAmpTrend(unit, rows), [unit, rows])
  const energyBars = useMemo(() => buildEnergyBars(unit, rows), [unit, rows])
  const energyCurves = useMemo(() => buildEnergyCurves(unit, rows), [unit, rows])
  const curveMeters = rows.slice(0, 2)

  const pieData = useMemo(
    () =>
      rows.map((row) => ({
        name: row.name,
        value: row.power ?? 0,
      })),
    [rows]
  )
  const statsSummary = useMemo(() => {
    const voltageValues = rows
      .map((row) => row.voltage)
      .filter((value): value is number => value != null)
    const currentValues = rows
      .map((row) => row.amperage)
      .filter((value): value is number => value != null)
    const powerValues = rows
      .map((row) => row.power)
      .filter((value): value is number => value != null)

    const sum = (values: number[]) =>
      values.reduce((acc, value) => acc + value, 0)
    const avg = (values: number[]) =>
      values.length > 0 ? sum(values) / values.length : null
    const max = (values: number[]) =>
      values.length > 0 ? Math.max(...values) : null
    const min = (values: number[]) =>
      values.length > 0 ? Math.min(...values) : null

    return {
      meterCount: rows.length,
      avgVoltage: avg(voltageValues),
      avgCurrent: avg(currentValues),
      totalPower: sum(powerValues),
      peakPower: max(powerValues),
      minVoltage: min(voltageValues),
      maxVoltage: max(voltageValues),
    }
  }, [rows])

  const onMeterClick = (row: MeterRow) => {
    const meterValue = row.meterKey || row.name
    router.push(
      `/devices/ems/${encodeURIComponent(unit.unitId)}/charts?meter=${encodeURIComponent(meterValue)}`
    )
  }

  const saveLabel = async (meterKey: string) => {
    const nextLabel = (labelDrafts[meterKey] ?? "").trim()
    setSavingMeterKey(meterKey)

    try {
      const response = await fetch(
        `/api/customer/ems/${encodeURIComponent(unit.unitId)}/meter-labels`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            meterKey,
            label: nextLabel,
          }),
        }
      )

      if (!response.ok) {
        toast.error("Unable to save meter label")
        return
      }

      setMeterLabels((current) => ({
        ...current,
        [meterKey]: nextLabel || null,
      }))
      setEditingMeterKey(null)
      toast.success("Meter label updated")
    } catch {
      toast.error("Unable to save meter label")
    } finally {
      setSavingMeterKey(null)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1700px] gap-3 xl:grid-cols-12">
      <article className="rounded-xl border bg-card p-3 shadow-sm xl:col-span-4">
        <h2 className="text-2xl font-semibold leading-none sm:text-[28px] xl:text-[32px]">Voltage</h2>
        <div className="mt-2 h-[220px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={voltageTrend} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={20} />
              <YAxis tick={{ fontSize: 10 }} width={28} />
              <Tooltip />
              {rows.map((meter, index) => (
                <Line
                  key={meter.meterKey}
                  type="monotone"
                  dataKey={meter.meterKey}
                  name={meter.name}
                  dot={false}
                  strokeWidth={2}
                  stroke={seriesColors[index % seriesColors.length]}
                />
              ))}
              {!isMobile ? <Legend /> : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border bg-card p-3 shadow-sm xl:col-span-4">
        <h2 className="text-2xl font-semibold leading-none sm:text-[28px] xl:text-[32px]">Energy consumption</h2>
        <p className="mt-1 text-sm text-muted-foreground">History</p>
        <div className="mt-2 h-[220px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={energyBars} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={24} />
              <YAxis tick={{ fontSize: 10 }} width={28} />
              <Tooltip />
              {!isMobile ? <Legend formatter={(value) => <span className="px-1">{value}</span>} /> : null}
              {rows.map((meter, index) => (
                <Bar
                  key={meter.meterKey}
                  dataKey={meter.meterKey}
                  name={meter.name}
                  fill={seriesColors[index % seriesColors.length]}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border bg-card p-3 shadow-sm xl:col-span-4">
        <h2 className="text-2xl font-semibold leading-none sm:text-[28px] xl:text-[32px]">Energy meters</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-[680px] text-xs sm:min-w-full sm:text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Label</th>
                <th className="px-2 py-2 font-medium">Voltage, V</th>
                <th className="px-2 py-2 font-medium">Amperage, V</th>
                <th className="px-2 py-2 font-medium">Power, W</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.meterKey}
                  className="cursor-pointer border-b transition hover:bg-muted/35"
                  onClick={() => onMeterClick(row)}
                >
                  <td className="px-2 py-2.5 font-medium sm:py-3">{row.name}</td>
                  <td className="px-2 py-2.5 sm:py-3">
                    {editingMeterKey === row.meterKey ? (
                      <div
                        className="flex items-center gap-1.5"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          value={labelDrafts[row.meterKey] ?? row.label ?? ""}
                          onChange={(event) =>
                            setLabelDrafts((current) => ({
                              ...current,
                              [row.meterKey]: event.target.value,
                            }))
                          }
                          className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs sm:w-28"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            void saveLabel(row.meterKey)
                          }}
                          disabled={savingMeterKey === row.meterKey}
                          className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs hover:bg-muted/30 disabled:opacity-60"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-left text-xs text-foreground/90 hover:text-foreground"
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditingMeterKey(row.meterKey)
                        }}
                      >
                        <span>{row.label || "Set label"}</span>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2.5 sm:py-3">{formatNumber(row.voltage, 2)}</td>
                  <td className="px-2 py-2.5 sm:py-3">{formatNumber(row.amperage, 2)}</td>
                  <td className="px-2 py-2.5 sm:py-3">{formatNumber(row.power, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-xl border bg-card p-3 shadow-sm xl:col-span-4">
        <h2 className="text-2xl font-semibold leading-none sm:text-[28px] xl:text-[32px]">Energy consumption</h2>
        <div className="mt-2 h-[240px] sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={isMobile ? 78 : 120} label={!isMobile}>
                {pieData.map((slice, index) => (
                  <Cell key={`${slice.name}-${index}`} fill={seriesColors[index % seriesColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              {!isMobile ? <Legend /> : null}
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border bg-card p-3 shadow-sm xl:col-span-4">
        <h2 className="text-2xl font-semibold leading-none sm:text-[28px] xl:text-[32px]">Amperage</h2>
        <div className="mt-2 h-[240px] sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ampTrend} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={20} />
              <YAxis tick={{ fontSize: 10 }} width={28} />
              <Tooltip />
              {!isMobile ? <Legend /> : null}
              {rows.map((meter, index) => (
                <Area
                  key={meter.meterKey}
                  type="monotone"
                  dataKey={meter.meterKey}
                  name={meter.name}
                  stroke={seriesColors[index % seriesColors.length]}
                  fill={seriesColors[index % seriesColors.length]}
                  fillOpacity={0.22}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border bg-card p-3 shadow-sm xl:col-span-4">
        <h2 className="text-2xl font-semibold leading-none sm:text-[28px] xl:text-[32px]">Energy Curves</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {curveMeters.map((meter) => meter.name).join(" vs ")}
        </p>
        <div className="mt-2 h-[240px] sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={energyCurves} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="curve-blue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.12} />
                </linearGradient>
                <linearGradient id="curve-green" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.12} />
                </linearGradient>
                <linearGradient id="curve-red" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={20} />
              <YAxis tick={{ fontSize: 10 }} width={32} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey={curveMeters[0]?.meterKey}
                name={curveMeters[0]?.name}
                stroke="#3b82f6"
                fill="url(#curve-blue)"
                fillOpacity={1}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey={curveMeters[1]?.meterKey}
                name={curveMeters[1]?.name}
                stroke="#22c55e"
                fill="url(#curve-green)"
                fillOpacity={1}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Total"
                stroke="#ef4444"
                fill="url(#curve-red)"
                fillOpacity={1}
                strokeWidth={2}
              />
              {!isMobile ? <Legend /> : null}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border bg-card p-3 shadow-sm xl:col-span-6">
        <h2 className="text-2xl font-semibold leading-none">Live Unit Stats</h2>
        <div className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-muted/25 p-2.5">
            <p className="text-xs text-muted-foreground">Meters</p>
            <p className="mt-1 text-lg font-semibold">{statsSummary.meterCount}</p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-2.5">
            <p className="text-xs text-muted-foreground">Avg Voltage</p>
            <p className="mt-1 text-lg font-semibold">
              {formatNumber(statsSummary.avgVoltage, 2)} V
            </p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-2.5">
            <p className="text-xs text-muted-foreground">Avg Amperage</p>
            <p className="mt-1 text-lg font-semibold">
              {formatNumber(statsSummary.avgCurrent, 2)} A
            </p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-2.5">
            <p className="text-xs text-muted-foreground">Total Power</p>
            <p className="mt-1 text-lg font-semibold">
              {formatNumber(statsSummary.totalPower, 2)} W
            </p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-2.5">
            <p className="text-xs text-muted-foreground">Peak Power</p>
            <p className="mt-1 text-lg font-semibold">
              {formatNumber(statsSummary.peakPower, 2)} W
            </p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-2.5">
            <p className="text-xs text-muted-foreground">Voltage Range</p>
            <p className="mt-1 text-lg font-semibold">
              {formatNumber(statsSummary.minVoltage, 2)} - {formatNumber(statsSummary.maxVoltage, 2)} V
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-xl border bg-card p-3 shadow-sm xl:col-span-6">
        <h2 className="text-2xl font-semibold leading-none">Unit Snapshot</h2>
        <div className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/25 p-2.5">
            <p className="text-xs text-muted-foreground">Unit ID</p>
            <p className="mt-1 font-mono text-sm">{unit.unitId}</p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-2.5">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 text-sm font-semibold">{unit.status}</p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-2.5">
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="mt-1 text-sm font-semibold">{unit.locationLabel ?? "No location set"}</p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-2.5">
            <p className="text-xs text-muted-foreground">Last Seen</p>
            <p className="mt-1 text-sm font-semibold">
              {unit.lastSeenAt ? new Date(unit.lastSeenAt).toLocaleString() : "Never"}
            </p>
          </div>
        </div>
      </article>
    </div>
  )
}
