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
const voltageSeriesColors = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
]

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

function meterMetricByKey(meter: MeterEntry, key: string) {
  const normalizedKey = key.trim().toUpperCase()
  const metric = meter.metrics.find(
    (entry) => entry.key.trim().toUpperCase() === normalizedKey
  )
  return metric?.value ?? null
}

function averageFinite(values: Array<number | null>) {
  const usable = values.filter((value): value is number => value != null)
  if (usable.length === 0) {
    return null
  }
  return usable.reduce((sum, value) => sum + value, 0) / usable.length
}

function meterLineToLineVoltage(meter: MeterEntry) {
  return averageFinite([
    meterMetricByKey(meter, "VRY"),
    meterMetricByKey(meter, "VYB"),
    meterMetricByKey(meter, "VBR"),
  ])
}

function meterLineToNeutralVoltage(meter: MeterEntry) {
  return averageFinite([
    meterMetricByKey(meter, "VRN"),
    meterMetricByKey(meter, "VYN"),
    meterMetricByKey(meter, "VBN"),
  ])
}

function meterFromLog(log: UnitLog, meterKey: string) {
  return log.meters.find((meter) => meter.meterKey === meterKey) ?? null
}

function buildMeterRows(
  unit: CustomerUnitDetail,
  labelOverrides: Record<string, string | null>
): MeterRow[] {
  return unit.latestMeters.map((meter) => {
    const voltage =
      meterLineToLineVoltage(meter) ??
      meterLineToNeutralVoltage(meter) ??
      meterMetricByAliases(meter, ["voltage", "vll", "vr", "vy", "vb", "volt"])
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
      row[`${meter.meterKey}__ll`] = entry ? meterLineToLineVoltage(entry) : null
      row[`${meter.meterKey}__ln`] = entry ? meterLineToNeutralVoltage(entry) : null
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
  const [hiddenVoltageSeriesKeys, setHiddenVoltageSeriesKeys] = useState<string[]>([])
  const [hiddenEnergySeriesKeys, setHiddenEnergySeriesKeys] = useState<string[]>([])
  const [hiddenPieSeriesKeys, setHiddenPieSeriesKeys] = useState<string[]>([])
  const [hiddenAmperageSeriesKeys, setHiddenAmperageSeriesKeys] = useState<string[]>([])
  const [hiddenCurveSeriesKeys, setHiddenCurveSeriesKeys] = useState<string[]>([])

  const rows = useMemo(() => buildMeterRows(unit, meterLabels), [meterLabels, unit])
  const meterDisplayName = (row: MeterRow) => row.label?.trim() || row.name

  const voltageTrend = useMemo(() => buildVoltageTrend(unit, rows), [unit, rows])
  const ampTrend = useMemo(() => buildAmpTrend(unit, rows), [unit, rows])
  const energyBars = useMemo(() => buildEnergyBars(unit, rows), [unit, rows])
  const energyCurves = useMemo(() => buildEnergyCurves(unit, rows), [unit, rows])
  const curveMeters = rows.slice(0, 2)
  const hiddenVoltageSeries = useMemo(
    () => new Set(hiddenVoltageSeriesKeys),
    [hiddenVoltageSeriesKeys]
  )
  const hiddenEnergySeries = useMemo(
    () => new Set(hiddenEnergySeriesKeys),
    [hiddenEnergySeriesKeys]
  )
  const hiddenPieSeries = useMemo(
    () => new Set(hiddenPieSeriesKeys),
    [hiddenPieSeriesKeys]
  )
  const hiddenAmperageSeries = useMemo(
    () => new Set(hiddenAmperageSeriesKeys),
    [hiddenAmperageSeriesKeys]
  )
  const hiddenCurveSeries = useMemo(
    () => new Set(hiddenCurveSeriesKeys),
    [hiddenCurveSeriesKeys]
  )
  const voltageSeries = useMemo(
    () =>
      rows.flatMap((meter, meterIndex) => [
        {
          key: `${meter.meterKey}__ll`,
          name: `${meterDisplayName(meter)} (L-L)`,
          color: voltageSeriesColors[(meterIndex * 2) % voltageSeriesColors.length],
          dash: undefined as string | undefined,
        },
        {
          key: `${meter.meterKey}__ln`,
          name: `${meterDisplayName(meter)} (L-N)`,
          color: voltageSeriesColors[(meterIndex * 2 + 1) % voltageSeriesColors.length],
          dash: "6 4",
        },
      ]),
    [rows]
  )

  const pieData = useMemo(
    () =>
      rows.map((row, index) => ({
        meterKey: row.meterKey,
        name: meterDisplayName(row),
        value: row.power ?? 0,
        color: seriesColors[index % seriesColors.length],
      })),
    [rows]
  )
  const pieDataVisible = useMemo(
    () => pieData.filter((slice) => !hiddenPieSeries.has(slice.meterKey)),
    [hiddenPieSeries, pieData]
  )
  const toggleSeries = (
    key: string,
    setHidden: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setHidden((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key]
    )
  }
  const renderLegend = (
    hidden: Set<string>,
    setHidden: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    // eslint-disable-next-line react/display-name
    return ({
      payload,
    }: {
      payload?: ReadonlyArray<{
        dataKey?: string | number | ((obj: unknown) => unknown)
        value?: string
        color?: string
      }>
    }) => {
      if (!payload || payload.length === 0) {
        return null
      }
      return (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {payload.map((entry, index) => {
            const keyBase = typeof entry.dataKey === "function"
              ? entry.value ?? `series-${index}`
              : entry.dataKey ?? entry.value ?? index
            const key = String(keyBase)
            const isHidden = hidden.has(key)
            return (
              <button
                key={key}
                type="button"
                className={`inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition ${isHidden ? "opacity-45" : "opacity-100"}`}
                onClick={() => {
                  toggleSeries(key, setHidden)
                }}
                title={isHidden ? "Click to show" : "Click to hide"}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color ?? "#64748b" }}
                />
                <span className={isHidden ? "line-through" : ""}>{entry.value ?? key}</span>
              </button>
            )
          })}
        </div>
      )
    }
  }
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
              {voltageSeries.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.name}
                  dot={false}
                  strokeWidth={2}
                  strokeDasharray={series.dash}
                  stroke={series.color}
                  hide={hiddenVoltageSeries.has(series.key)}
                />
              ))}
              {!isMobile ? <Legend content={renderLegend(hiddenVoltageSeries, setHiddenVoltageSeriesKeys)} /> : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border bg-card p-3 shadow-sm xl:col-span-4">
        <h2 className="text-2xl font-semibold leading-none sm:text-[28px] xl:text-[32px]">Energy consumption</h2>
        <div className="mt-2 h-[220px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={energyBars} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={24} />
              <YAxis tick={{ fontSize: 10 }} width={28} />
              <Tooltip />
              {!isMobile ? <Legend content={renderLegend(hiddenEnergySeries, setHiddenEnergySeriesKeys)} /> : null}
              {rows.map((meter, index) => (
                <Bar
                  key={meter.meterKey}
                  dataKey={meter.meterKey}
                  name={meterDisplayName(meter)}
                  fill={seriesColors[index % seriesColors.length]}
                  radius={[2, 2, 0, 0]}
                  hide={hiddenEnergySeries.has(meter.meterKey)}
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
                  <td className="px-2 py-2.5 font-medium sm:py-3">{meterDisplayName(row)}</td>
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
            <PieChart margin={{ top: 8, right: 8, left: 8, bottom: isMobile ? 8 : 22 }}>
              <Pie
                data={pieDataVisible}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy={isMobile ? "50%" : "46%"}
                outerRadius={isMobile ? 76 : 112}
                label={false}
              >
                {pieDataVisible.map((slice, index) => (
                  <Cell key={`${slice.meterKey}-${index}`} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {!isMobile ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {pieData.map((slice) => {
              const hidden = hiddenPieSeries.has(slice.meterKey)
              return (
                <button
                  key={slice.meterKey}
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition ${hidden ? "opacity-45" : "opacity-100"}`}
                  onClick={() => {
                    toggleSeries(slice.meterKey, setHiddenPieSeriesKeys)
                  }}
                  title={hidden ? "Click to show" : "Click to hide"}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className={hidden ? "line-through" : ""}>{slice.name}</span>
                </button>
              )
            })}
          </div>
        ) : null}
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
              {!isMobile ? <Legend content={renderLegend(hiddenAmperageSeries, setHiddenAmperageSeriesKeys)} /> : null}
              {rows.map((meter, index) => (
                <Area
                  key={meter.meterKey}
                  type="monotone"
                  dataKey={meter.meterKey}
                  name={meterDisplayName(meter)}
                  stroke={seriesColors[index % seriesColors.length]}
                  fill={seriesColors[index % seriesColors.length]}
                  fillOpacity={0.22}
                  hide={hiddenAmperageSeries.has(meter.meterKey)}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border bg-card p-3 shadow-sm xl:col-span-4">
        <h2 className="text-2xl font-semibold leading-none sm:text-[28px] xl:text-[32px]">Energy Curves</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {curveMeters.map((meter) => meterDisplayName(meter)).join(" vs ")}
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
                name={curveMeters[0] ? meterDisplayName(curveMeters[0]) : undefined}
                stroke="#3b82f6"
                fill="url(#curve-blue)"
                fillOpacity={1}
                strokeWidth={2}
                hide={curveMeters[0] ? hiddenCurveSeries.has(curveMeters[0].meterKey) : false}
              />
              <Area
                type="monotone"
                dataKey={curveMeters[1]?.meterKey}
                name={curveMeters[1] ? meterDisplayName(curveMeters[1]) : undefined}
                stroke="#22c55e"
                fill="url(#curve-green)"
                fillOpacity={1}
                strokeWidth={2}
                hide={curveMeters[1] ? hiddenCurveSeries.has(curveMeters[1].meterKey) : false}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Total"
                stroke="#ef4444"
                fill="url(#curve-red)"
                fillOpacity={1}
                strokeWidth={2}
                hide={hiddenCurveSeries.has("total")}
              />
              {!isMobile ? <Legend content={renderLegend(hiddenCurveSeries, setHiddenCurveSeriesKeys)} /> : null}
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
            <p className="text-xs text-muted-foreground">Unit</p>
            <p className="mt-1 text-sm font-semibold">
              {unit.displayName?.trim() || unit.unitId}
            </p>
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
