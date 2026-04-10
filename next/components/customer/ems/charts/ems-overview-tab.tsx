import { motion } from "framer-motion"
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
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  formatNumber,
  getPagedTrendRows,
  chartGradients,
  gradientCardClassName,
  LOG_SCOPE_LIMIT,
  LOG_WINDOW_SIZE,
  phaseColors,
} from "@/components/customer/ems/helpers"
import type {
  ReportRange,
  SummaryStats,
  TrendPoint,
} from "@/components/customer/ems/types"
import { useState } from "react"

type OverviewSnapshot = {
  voltageLL: number | null
  voltageR: number | null
  voltageY: number | null
  voltageB: number | null
  currentTotal: number | null
  currentR: number | null
  currentY: number | null
  currentB: number | null
  powerFactorAvg: number | null
  powerFactorR: number | null
  powerFactorY: number | null
  powerFactorB: number | null
  frequency: number | null
}

function MetricGauge({
  label,
  value,
  min,
  max,
  unit,
  accent,
}: {
  label: string
  value: number | null
  min: number
  max: number
  unit: string
  accent: string
}) {
  const safe = value ?? 0
  const clamped = Math.max(min, Math.min(safe, max))
  const ratio = (clamped - min) / Math.max(max - min, 1)
  const angle = 180 - ratio * 180
  const radius = 56
  const center = 90
  const angleInRadian = (Math.PI / 180) * angle
  const needleX = center + radius * Math.cos(angleInRadian)
  const needleY = center - radius * Math.sin(angleInRadian)

  return (
    <div className="rounded-xl border border-border/70 bg-muted/15 p-3">
      <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="relative mt-1 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="62%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={10}
            data={[{ value: max }]}
            startAngle={180}
            endAngle={0}
          >
            <PolarGrid radialLines={false} stroke="#d1d5db" />
            <PolarAngleAxis
              type="number"
              domain={[min, max]}
              tickCount={5}
              angleAxisId={0}
              tick={{ fontSize: 10, fill: "#6b7280" }}
            />
            <PolarRadiusAxis tick={false} axisLine={false} />
            <RadialBar
              dataKey="value"
              fill="#e5e7eb"
              cornerRadius={8}
              background
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 180 140"
        >
          <line
            x1={90}
            y1={90}
            x2={needleX}
            y2={needleY}
            stroke={accent}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx={90} cy={90} r={5} fill={accent} />
        </svg>
        <div className="absolute right-0 bottom-0 left-0 text-center">
          <p className="text-2xl font-semibold">
            {formatNumber(value, 2)} {unit}
          </p>
        </div>
      </div>
    </div>
  )
}

export function EmsOverviewTab({
  trendRows,
  snapshot,
  summary,
  summaryRange,
  onSummaryRangeChange,
}: {
  trendRows: TrendPoint[]
  snapshot: OverviewSnapshot
  summary: SummaryStats
  summaryRange: Extract<ReportRange, "24h" | "7d" | "30d">
  onSummaryRangeChange: (
    nextRange: Extract<ReportRange, "24h" | "7d" | "30d">
  ) => void
}) {
  const [page, setPage] = useState(0)
  const pageData = getPagedTrendRows(trendRows, page)

  const phaseOverview = [
    {
      phase: "R",
      current: snapshot.currentR ?? 0,
      voltage: snapshot.voltageR ?? 0,
      pf: snapshot.powerFactorR ?? 0,
      color: phaseColors.red,
    },
    {
      phase: "Y",
      current: snapshot.currentY ?? 0,
      voltage: snapshot.voltageY ?? 0,
      pf: snapshot.powerFactorY ?? 0,
      color: phaseColors.amber,
    },
    {
      phase: "B",
      current: snapshot.currentB ?? 0,
      voltage: snapshot.voltageB ?? 0,
      pf: snapshot.powerFactorB ?? 0,
      color: phaseColors.blue,
    },
  ]

  const latestRows = pageData.rows

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <MetricGauge
              label="Voltage-LL"
              value={snapshot.voltageLL}
              min={0}
              max={800}
              unit="V"
              accent={phaseColors.red}
            />
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground sm:text-sm">
              <p>R: {formatNumber(snapshot.voltageR, 1)}V</p>
              <p>Y: {formatNumber(snapshot.voltageY, 1)}V</p>
              <p>B: {formatNumber(snapshot.voltageB, 1)}V</p>
            </div>
          </div>
        </article>
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <MetricGauge
              label="Current"
              value={snapshot.currentTotal}
              min={0}
              max={300}
              unit="A"
              accent={phaseColors.amber}
            />
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground sm:text-sm">
              <p>R: {formatNumber(snapshot.currentR, 1)}A</p>
              <p>Y: {formatNumber(snapshot.currentY, 1)}A</p>
              <p>B: {formatNumber(snapshot.currentB, 1)}A</p>
            </div>
          </div>
        </article>
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <MetricGauge
              label="Power Factor"
              value={snapshot.powerFactorAvg}
              min={0}
              max={2}
              unit=""
              accent={phaseColors.blue}
            />
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground sm:text-sm">
              <p>R: {formatNumber(snapshot.powerFactorR, 2)}</p>
              <p>Y: {formatNumber(snapshot.powerFactorY, 2)}</p>
              <p>B: {formatNumber(snapshot.powerFactorB, 2)}</p>
            </div>
          </div>
        </article>
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <MetricGauge
              label="Frequency"
              value={snapshot.frequency}
              min={0}
              max={70}
              unit="Hz"
              accent={phaseColors.green}
            />
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground sm:text-sm">
              <p>R: {formatNumber(snapshot.frequency, 2)}Hz</p>
              <p>Y: {formatNumber(snapshot.frequency, 2)}Hz</p>
              <p>B: {formatNumber(snapshot.frequency, 2)}Hz</p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-sm font-semibold">Voltage + Current Trends</p>
            <div className="mt-3 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latestRows}>
                  <defs>
                    <linearGradient
                      id="overview-vbr-line"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={chartGradients.blue.from} />
                      <stop offset="100%" stopColor={chartGradients.blue.to} />
                    </linearGradient>
                    <linearGradient
                      id="overview-iy-line"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                    <linearGradient
                      id="overview-ib-line"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#0891b2" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#cbd5e1"
                    strokeOpacity={0.45}
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="VRY"
                    stroke={phaseColors.red}
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="VYB"
                    stroke={phaseColors.amber}
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="VBR"
                    stroke="url(#overview-vbr-line)"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="IR"
                    stroke="#7c3aed"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="IY"
                    stroke="url(#overview-iy-line)"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="IB"
                    stroke="url(#overview-ib-line)"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-sm font-semibold">Power Factor Health</p>
            <div className="mt-3 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latestRows}>
                  <defs>
                    <linearGradient
                      id="overview-pfb-stroke"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={chartGradients.blue.from} />
                      <stop offset="100%" stopColor={chartGradients.blue.to} />
                    </linearGradient>
                    <linearGradient
                      id="overview-pfb-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={chartGradients.blue.to}
                        stopOpacity={0.22}
                      />
                      <stop
                        offset="100%"
                        stopColor={chartGradients.blue.from}
                        stopOpacity={0.08}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#cbd5e1"
                    strokeOpacity={0.45}
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="PF-R"
                    stroke={phaseColors.red}
                    fill={phaseColors.red}
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="PF-Y"
                    stroke={phaseColors.amber}
                    fill={phaseColors.amber}
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="PF-B"
                    stroke="url(#overview-pfb-stroke)"
                    fill="url(#overview-pfb-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-sm font-semibold">Phase Snapshot</p>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={phaseOverview}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#cbd5e1"
                    strokeOpacity={0.45}
                  />
                  <XAxis dataKey="phase" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="voltage"
                    name="Voltage (V)"
                    radius={[8, 8, 0, 0]}
                  >
                    <Cell fill={phaseColors.red} />
                    <Cell fill={phaseColors.amber} />
                    <Cell fill={phaseColors.blue} />
                  </Bar>
                  <Bar
                    dataKey="current"
                    name="Current (A)"
                    radius={[8, 8, 0, 0]}
                  >
                    <Cell fill="#7c3aed" />
                    <Cell fill="#0ea5e9" />
                    <Cell fill="#0f766e" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-sm font-semibold">Energy Curves</p>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latestRows}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#cbd5e1"
                    strokeOpacity={0.45}
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Kwh"
                    stroke={phaseColors.green}
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="KvAh"
                    stroke={phaseColors.indigo}
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="KvArh"
                    stroke={phaseColors.cyan}
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <p>
                Showing logs {pageData.from}-{pageData.to} of {pageData.total}{" "}
                (last {LOG_SCOPE_LIMIT})
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(prev + 1, pageData.totalPages - 1)
                    )
                  }
                  disabled={pageData.activePage >= pageData.totalPages - 1}
                  className="h-8 rounded-lg border border-border bg-white px-3 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                  disabled={pageData.activePage === 0}
                  className="h-8 rounded-lg border border-border bg-white px-3 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Line-chart window: {LOG_WINDOW_SIZE} logs per page
            </p>
          </div>
        </article>
      </section>

      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">Statistical Summary</p>
              <p className="text-sm text-muted-foreground">
                Dynamic range analytics
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "24h" as const, label: "Last 24 Hours" },
                { key: "7d" as const, label: "Last 7 Days" },
                { key: "30d" as const, label: "Last 30 Days" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSummaryRangeChange(item.key)}
                  className={
                    summaryRange === item.key
                      ? "h-9 rounded-xl bg-[#2b3242] px-3 text-[11px] font-semibold tracking-[0.1em] text-white uppercase"
                      : "h-9 rounded-xl border border-border bg-white px-3 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase"
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-sky-200/70 bg-linear-to-b from-sky-50 to-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-sky-900">Voltage (V)</p>
              <div className="mt-3 space-y-2">
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Maximum</span>
                  <span className="font-semibold">
                    {formatNumber(summary.voltage.max, 2)} V
                  </span>
                </p>
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Minimum</span>
                  <span className="font-semibold">
                    {formatNumber(summary.voltage.min, 2)} V
                  </span>
                </p>
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Average</span>
                  <span className="font-semibold">
                    {formatNumber(summary.voltage.avg, 2)} V
                  </span>
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-linear-to-b from-blue-50 to-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-blue-900">Current (A)</p>
              <div className="mt-3 space-y-2">
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Maximum</span>
                  <span className="font-semibold">
                    {formatNumber(summary.current.max, 2)} A
                  </span>
                </p>
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Minimum</span>
                  <span className="font-semibold">
                    {formatNumber(summary.current.min, 2)} A
                  </span>
                </p>
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Average</span>
                  <span className="font-semibold">
                    {formatNumber(summary.current.avg, 2)} A
                  </span>
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-indigo-200/70 bg-linear-to-b from-indigo-50 to-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-indigo-900">
                Power (kW)
              </p>
              <div className="mt-3 space-y-2">
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Maximum</span>
                  <span className="font-semibold">
                    {formatNumber(summary.power.max, 2)} kW
                  </span>
                </p>
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Minimum</span>
                  <span className="font-semibold">
                    {formatNumber(summary.power.min, 2)} kW
                  </span>
                </p>
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Average</span>
                  <span className="font-semibold">
                    {formatNumber(summary.power.avg, 2)} kW
                  </span>
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-linear-to-b from-slate-50 to-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                Power Factor
              </p>
              <div className="mt-3 space-y-2">
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Maximum</span>
                  <span className="font-semibold">
                    {formatNumber(summary.powerFactor.max, 3)}
                  </span>
                </p>
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Minimum</span>
                  <span className="font-semibold">
                    {formatNumber(summary.powerFactor.min, 3)}
                  </span>
                </p>
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Average</span>
                  <span className="font-semibold">
                    {formatNumber(summary.powerFactor.avg, 3)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>
    </motion.div>
  )
}
