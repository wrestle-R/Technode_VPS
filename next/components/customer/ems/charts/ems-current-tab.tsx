import { motion } from "framer-motion"
import {
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
  chartGradients,
  formatNumber,
  getPagedTrendRows,
  gradientCardClassName,
  LOG_SCOPE_LIMIT,
  LOG_WINDOW_SIZE,
  metricValueFromLatest,
  phaseColors,
} from "@/components/customer/ems/helpers"
import type {
  HourlyCurrentPoint,
  TrendPoint,
} from "@/components/customer/ems/types"
import { useMemo, useState } from "react"

const GAUGE_MAX_CURRENT = 180

function CurrentGauge({
  label,
  value,
  color,
}: {
  label: "IR" | "IY" | "IB"
  value: number
  color: string
}) {
  const clamped = Math.max(0, Math.min(value, GAUGE_MAX_CURRENT))
  const angle = 180 - (clamped / GAUGE_MAX_CURRENT) * 180
  const radius = 68
  const center = 100
  const angleInRadian = (Math.PI / 180) * angle
  const needleX = center + radius * Math.cos(angleInRadian)
  const needleY = center - radius * Math.sin(angleInRadian)

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
      <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="relative mt-2 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="60%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={14}
            data={[{ value: GAUGE_MAX_CURRENT }]}
            startAngle={180}
            endAngle={0}
          >
            <PolarGrid radialLines={false} stroke="#d1d5db" />
            <PolarAngleAxis
              type="number"
              domain={[0, GAUGE_MAX_CURRENT]}
              tickCount={5}
              angleAxisId={0}
              tick={{ fontSize: 10, fill: "#6b7280" }}
            />
            <PolarRadiusAxis tick={false} axisLine={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              fill="#e5e7eb"
              background
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 200 160"
        >
          <line
            x1={100}
            y1={100}
            x2={needleX}
            y2={needleY}
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx={100} cy={100} r={6} fill={color} />
        </svg>

        <div className="absolute right-0 bottom-0 left-0 text-center">
          <p className="text-2xl font-semibold">{formatNumber(value, 2)} A</p>
        </div>
      </div>
    </div>
  )
}

export function EmsCurrentTab({
  trendRows,
  hourlyCurrentPoints,
}: {
  trendRows: TrendPoint[]
  hourlyCurrentPoints: HourlyCurrentPoint[]
}) {
  const [page, setPage] = useState(0)
  const pageData = getPagedTrendRows(trendRows, page)
  const latestIR = metricValueFromLatest(trendRows, "IR") ?? 0
  const latestIY = metricValueFromLatest(trendRows, "IY") ?? 0
  const latestIB = metricValueFromLatest(trendRows, "IB") ?? 0
  const hourlyAverages = useMemo(
    () =>
      hourlyCurrentPoints.map((point) => ({
        hour: point.hour,
        averageCurrent: point.averageCurrent,
      })),
    [hourlyCurrentPoints]
  )
  const hasHourlyData = hourlyCurrentPoints.some(
    (point) => typeof point.averageCurrent === "number"
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-4 xl:grid-cols-2"
    >
      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-4">
          <p className="text-sm font-semibold">Current Trend</p>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pageData.rows}>
                <defs>
                  <linearGradient
                    id="current-ib-line"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop offset="0%" stopColor={chartGradients.blue.from} />
                    <stop offset="100%" stopColor={chartGradients.blue.to} />
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
                  dataKey="IR"
                  stroke={phaseColors.red}
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="IY"
                  stroke={phaseColors.amber}
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="IB"
                  stroke="url(#current-ib-line)"
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
                  setPage((prev) => Math.min(prev + 1, pageData.totalPages - 1))
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
        </div>
      </article>

      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-4">
          <p className="text-sm font-semibold">Latest Phase Currents</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <CurrentGauge label="IR" value={latestIR} color={phaseColors.red} />
            <CurrentGauge
              label="IY"
              value={latestIY}
              color={phaseColors.amber}
            />
            <CurrentGauge
              label="IB"
              value={latestIB}
              color={phaseColors.blue}
            />
          </div>
        </div>
      </article>

      <article className={gradientCardClassName("xl:col-span-2")}>
        <div className="rounded-[15px] bg-card p-4">
          <p className="text-sm font-semibold">
            Hourly Average Current (Last 24 Hours)
          </p>
          <p className="text-xs text-muted-foreground">
            Average of IR, IY, IB per hour (24 bars)
          </p>
          <div className="mt-3 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyAverages}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#cbd5e1"
                  strokeOpacity={0.45}
                />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => {
                    if (typeof value !== "number" || Number.isNaN(value)) {
                      return "-"
                    }
                    const numeric = value
                    return `${formatNumber(numeric, 2)} A`
                  }}
                />
                <Bar dataKey="averageCurrent" radius={[8, 8, 0, 0]}>
                  {hourlyAverages.map((_, index) => (
                    <Cell
                      key={`hour-bar-${index}`}
                      fill={
                        index % 2 === 0 ? phaseColors.indigo : phaseColors.cyan
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Line-chart window: {LOG_WINDOW_SIZE} logs per page
          </p>
          {!hasHourlyData ? (
            <p className="mt-1 text-xs text-muted-foreground">
              No current data available in the last 24 hours for this meter.
            </p>
          ) : null}
        </div>
      </article>
    </motion.div>
  )
}
