"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  Bell,
  Clock3,
  Eye,
  Expand,
  RefreshCw,
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"

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
import type { AlertInstance } from "@/components/customer/alerts/types"

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
  meterName,
  children,
}: {
  title: string
  subtitle: string
  latest: number | null
  unit: string
  color: string
  isReady: boolean
  expandHref: string
  meterName: string
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
          <span className="truncate">{meterName}</span>
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

function severityClass(value: AlertInstance["severity"]) {
  if (value === "critical") {
    return "border-red-400/30 bg-red-500/10 text-red-700"
  }
  if (value === "warning") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-700"
  }
  return "border-sky-400/30 bg-sky-500/10 text-sky-700"
}

function AlertsPanel() {
  const [rows, setRows] = useState<AlertInstance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchRecentAlerts = async (loading = true) => {
    if (loading) {
      setIsLoading(true)
    }

    try {
      const response = await fetch(
        "/api/customer/alerts?mode=recent&status=open&seen=false&limit=6",
        {
          cache: "no-store",
        }
      )

      if (!response.ok) {
        toast.error("Unable to load alerts")
        return
      }

      const data = (await response.json()) as { rows?: AlertInstance[] }
      setRows(data.rows ?? [])
    } catch {
      toast.error("Unable to load alerts")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchRecentAlerts(true)
  }, [])

  const markSeen = async (id: string) => {
    try {
      const response = await fetch(`/api/customer/alerts/${id}/seen`, {
        method: "POST",
      })

      if (!response.ok) {
        toast.error("Unable to mark alert as seen")
        return
      }

      setRows((current) => current.filter((row) => row.id !== id))
      toast.success("Alert marked as seen")
    } catch {
      toast.error("Unable to mark alert as seen")
    }
  }

  return (
    <aside className="flex h-full min-w-0 flex-col rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border p-3">
        <div className="min-w-0">
          <h2 className="text-xl leading-tight font-semibold text-foreground sm:text-2xl">
            Alerts
          </h2>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <span>Realtime - active alerts</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Refresh alerts"
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              setIsRefreshing(true)
              void fetchRecentAlerts(false)
            }}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="w-10 px-3 py-3">
                <Bell className="h-4 w-4" />
              </th>
              <th className="w-[26%] px-2 py-3 font-medium">Start time</th>
              <th className="w-[30%] px-2 py-3 font-medium">Type</th>
              <th className="w-[18%] px-2 py-3 font-medium">Severity</th>
              <th className="w-[12%] px-2 py-3 font-medium">Status</th>
              <th className="w-[14%] px-2 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-4 text-muted-foreground" colSpan={6}>
                  Loading alerts...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-muted-foreground" colSpan={6}>
                  No active unseen alerts.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border/80">
                  <td className="px-3 py-4">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </td>
                  <td className="px-2 py-4 text-xs text-muted-foreground break-words">
                    {new Date(row.triggeredAt).toLocaleString()}
                  </td>
                  <td className="px-2 py-4 text-xs font-medium break-words">
                    {row.type === "metric" ? "Metric" : "Device Offline"}
                    <br />
                    <span className="text-muted-foreground">
                      {row.meterKey ? `Meter ${row.meterKey}` : "Unit level"}
                    </span>
                  </td>
                  <td className="px-2 py-4">
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${severityClass(row.severity)}`}>
                      {row.severity}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-xs text-muted-foreground">
                    {row.status}
                  </td>
                  <td className="px-2 py-4 text-right">
                    <button
                      type="button"
                      aria-label={`Mark alert ${row.id} as seen`}
                      className="inline-flex items-center justify-end gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      onClick={() => {
                        void markSeen(row.id)
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Seen
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border p-3 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <Bell className="h-4 w-4 shrink-0" />
          <span className="truncate">Live alert stream</span>
        </div>
        <span className="shrink-0">{rows.length} active</span>
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
            meterName={meterName}
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
            meterName={meterName}
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
            meterName={meterName}
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
            meterName={meterName}
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
                  domain={["dataMin - 0.5", "dataMax + 0.5"]}
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
                  dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
                  activeDot={{ r: 5 }}
                  connectNulls
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
        <AlertsPanel />
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:col-span-12 xl:grid-cols-4">
        {[
          ["Meter", meterName],
          ["Latest frequency", `${formatNumber(latestFrequency, 2)} Hz`],
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
