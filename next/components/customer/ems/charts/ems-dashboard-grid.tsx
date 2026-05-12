"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  Bell,
  Check,
  Clock3,
  Columns3,
  Expand,
  Filter,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatNumber, phaseColors } from "@/components/customer/ems/helpers"
import {
  buildAmperagePoints,
  buildDashboardPoints,
  buildEnergyPoints,
  buildVoltagePoints,
  latestValue,
} from "@/components/customer/ems/charts/dashboard-chart-data"
import type {
  DashboardChartPanel,
  EnergyAnalytics,
  HourlyCurrentPoint,
  HourlyVoltagePoint,
  TrendPoint,
} from "@/components/customer/ems/types"

const axisTick = { fontSize: 11, fill: "#6b7280" }
const gridStroke = "#d1d5db"
const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #d9dee8",
  boxShadow: "0 12px 24px -18px rgba(15, 23, 42, 0.35)",
}

function ChartCard({
  title,
  subtitle,
  latest,
  unit,
  color,
  isReady,
  expandHref,
  children,
}: {
  title: string
  subtitle: string
  latest: number | null
  unit: string
  color: string
  isReady: boolean
  expandHref: string
  children: React.ReactNode
}) {
  return (
    <article className="min-w-0 rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl leading-tight font-semibold text-foreground sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {subtitle}
          </p>
        </div>
        <Link
          href={expandHref}
          aria-label={`Open expanded ${title} chart page`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Expand className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 h-[260px] min-h-[16rem] min-w-0 sm:h-[300px]">
        {isReady ? (
          children
        ) : (
          <div className="h-full w-full rounded-md border border-dashed border-border bg-muted/20" />
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 text-xs">
        <div className="flex min-w-0 items-center gap-2 text-foreground">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="truncate">Smart Meter A</span>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Avg</p>
          <p className="font-semibold text-foreground">
            {formatNumber(latest, unit === "kWh" ? 3 : 2)} {unit}
          </p>
        </div>
      </div>
    </article>
  )
}

function AlarmsPlaceholderPanel() {
  const placeholders = [
    { label: "High voltage placeholder", severity: "Critical" },
    { label: "Current spike placeholder", severity: "Warning" },
    { label: "Device offline placeholder", severity: "Info" },
  ]

  return (
    <aside className="flex h-full min-w-0 flex-col rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border p-3">
        <div className="min-w-0">
          <h2 className="text-xl leading-tight font-semibold text-foreground sm:text-2xl">
            Alarms
          </h2>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <span>Realtime - placeholder alerts</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Search placeholder alerts"
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Filter placeholder alerts"
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Column placeholder alerts"
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Columns3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-[540px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="w-10 px-4 py-3">
                <span className="block h-4 w-4 rounded border border-muted-foreground/50" />
              </th>
              <th className="px-3 py-3 font-medium">Start time</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium">Severity</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {placeholders.map((item, index) => (
              <tr key={item.label} className="border-b border-border/80">
                <td className="px-4 py-4">
                  <span className="block h-4 w-4 rounded border border-muted-foreground/50" />
                </td>
                <td className="px-3 py-4 text-xs text-muted-foreground">
                  Placeholder
                  <br />
                  row {index + 1}
                </td>
                <td className="px-3 py-4 font-medium">{item.label}</td>
                <td className="px-3 py-4">
                  <span className="rounded-full border border-dashed border-muted-foreground/40 px-2 py-1 text-xs font-semibold text-muted-foreground">
                    {item.severity}
                  </span>
                </td>
                <td className="px-3 py-4 text-xs text-muted-foreground">
                  Placeholder
                  <br />
                  not connected
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center justify-end gap-2 text-muted-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                    <Check className="h-4 w-4" />
                    <X className="h-4 w-4" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border p-3 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <Bell className="h-4 w-4 shrink-0" />
          <span className="truncate">Alarm integration placeholder</span>
        </div>
        <span className="shrink-0">0 active</span>
      </div>
    </aside>
  )
}

export function EmsDashboardGrid({
  unitId,
  meterKey,
  trendRows,
  hourlyCurrentPoints,
  hourlyVoltagePoints,
  energyAnalytics,
  meterName,
}: {
  unitId: string
  meterKey: string
  trendRows: TrendPoint[]
  hourlyCurrentPoints: HourlyCurrentPoint[]
  hourlyVoltagePoints: HourlyVoltagePoint[]
  energyAnalytics: EnergyAnalytics | null
  meterName: string
}) {
  const [isChartReady, setIsChartReady] = useState(false)
  const dashboardPoints = buildDashboardPoints(trendRows)
  const voltagePoints = buildVoltagePoints(trendRows, hourlyVoltagePoints)
  const amperagePoints = buildAmperagePoints(trendRows, hourlyCurrentPoints)
  const energyPoints = buildEnergyPoints(energyAnalytics, trendRows)
  const latestVoltage = latestValue(voltagePoints, "voltage")
  const latestFrequency = latestValue(dashboardPoints, "frequency")
  const latestAmperage = latestValue(amperagePoints, "amperage")
  const latestEnergy =
    energyPoints.length > 0
      ? (energyPoints[energyPoints.length - 1]?.consumption ?? null)
      : null

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsChartReady(true)
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [])

  const expandedHref = (panel: DashboardChartPanel) =>
    `/devices/ems/${encodeURIComponent(unitId)}/charts/${panel}?meter=${encodeURIComponent(meterKey)}`

  return (
    <div className="mx-auto grid w-full max-w-[1900px] gap-3 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-8">
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <ChartCard
            title="Voltage"
            subtitle={`Realtime - ${meterName}`}
            latest={latestVoltage}
            unit="V"
            color={phaseColors.green}
            isReady={isChartReady}
            expandHref={expandedHref("voltage")}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={220}
            >
              <LineChart
                data={voltagePoints}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke={gridStroke} strokeOpacity={0.7} />
                <XAxis dataKey="label" tick={axisTick} minTickGap={18} />
                <YAxis
                  tick={axisTick}
                  width={46}
                  tickFormatter={(value) => `${value} V`}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={235} stroke="#f1c40f" strokeWidth={2} />
                <ReferenceLine y={205} stroke="#f1c40f" strokeWidth={2} />
                <ReferenceLine y={200} stroke="#ef4444" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="voltage"
                  name="Voltage"
                  dot={false}
                  stroke={phaseColors.green}
                  strokeWidth={2}
                />
                <Brush
                  dataKey="label"
                  height={24}
                  travellerWidth={8}
                  stroke="#9dbdf5"
                  fill="#dbe8ff"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Energy consumption"
            subtitle="History - previous period"
            latest={latestEnergy}
            unit="kWh"
            color="#3498db"
            isReady={isChartReady}
            expandHref={expandedHref("energy")}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={220}
            >
              <BarChart
                data={energyPoints}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke={gridStroke} strokeOpacity={0.7} />
                <XAxis dataKey="label" tick={axisTick} minTickGap={18} />
                <YAxis
                  tick={axisTick}
                  width={52}
                  tickFormatter={(value) => `${value} kWh`}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="consumption"
                  name="Energy"
                  fill="#3498db"
                  radius={[2, 2, 0, 0]}
                />
                <Brush
                  dataKey="label"
                  height={24}
                  travellerWidth={8}
                  stroke="#9dbdf5"
                  fill="#dbe8ff"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Frequency"
            subtitle="Realtime - last readings"
            latest={latestFrequency}
            unit="Hz"
            color="#16864a"
            isReady={isChartReady}
            expandHref={expandedHref("frequency")}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={220}
            >
              <LineChart
                data={dashboardPoints}
                margin={{ top: 18, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke={gridStroke} strokeOpacity={0.7} />
                <XAxis dataKey="label" tick={axisTick} minTickGap={18} />
                <YAxis
                  tick={axisTick}
                  width={54}
                  domain={["dataMin - 0.2", "dataMax + 0.2"]}
                  tickFormatter={(value) => `${value} Hz`}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="frequency"
                  name="Frequency"
                  stroke="#16864a"
                  strokeWidth={2}
                  dot={false}
                />
                <Brush
                  dataKey="label"
                  height={24}
                  travellerWidth={8}
                  stroke="#9dbdf5"
                  fill="#dbe8ff"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Amperage"
            subtitle="Realtime - current draw"
            latest={latestAmperage}
            unit="A"
            color="#f97316"
            isReady={isChartReady}
            expandHref={expandedHref("amperage")}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={220}
            >
              <AreaChart
                data={amperagePoints}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="amperage-fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop
                      offset="100%"
                      stopColor="#f97316"
                      stopOpacity={0.08}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridStroke} strokeOpacity={0.7} />
                <XAxis dataKey="label" tick={axisTick} minTickGap={18} />
                <YAxis
                  tick={axisTick}
                  width={42}
                  tickFormatter={(value) => `${value} A`}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="amperage"
                  name="Amperage"
                  stroke="#f97316"
                  fill="url(#amperage-fill)"
                  strokeWidth={2}
                />
                <Brush
                  dataKey="label"
                  height={24}
                  travellerWidth={8}
                  stroke="#9dbdf5"
                  fill="#dbe8ff"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <div className="min-w-0 xl:col-span-4 xl:h-full">
        <AlarmsPlaceholderPanel />
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:col-span-12 xl:grid-cols-4">
        {[
          ["Meter", meterName],
          ["Readings", String(trendRows.length)],
          ["Latest voltage", `${formatNumber(latestVoltage, 2)} V`],
          ["Latest amperage", `${formatNumber(latestAmperage, 2)} A`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>{label}</span>
            </div>
            <p className="mt-2 truncate text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
