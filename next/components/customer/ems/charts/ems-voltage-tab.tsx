import { motion } from "framer-motion"
import {
  Bar,
  BarChart,
  CartesianGrid,
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
  dynamicGaugeMax,
  formatNumber,
  getPagedTrendRows,
  gradientCardClassName,
  LOG_SCOPE_LIMIT,
  LOG_WINDOW_SIZE,
  metricValueFromLatest,
  phaseColors,
} from "@/components/customer/ems/helpers"
import type {
  HourlyVoltagePoint,
  TrendPoint,
} from "@/components/customer/ems/types"
import { useMemo, useState } from "react"

const GAUGE_MAX_LN_VOLTAGE = 320
const GAUGE_MAX_LL_VOLTAGE = 520

function VoltageGauge({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number | null
  max: number
  color: string
}) {
  const safe = value ?? 0
  const clamped = Math.max(0, Math.min(safe, max))
  const angle = 180 - (clamped / max) * 180
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
            data={[{ value: max }]}
            startAngle={180}
            endAngle={0}
          >
            <PolarGrid radialLines={false} stroke="#d1d5db" />
            <PolarAngleAxis
              type="number"
              domain={[0, max]}
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
          <p className="text-xl font-semibold">{formatNumber(value, 2)} V</p>
        </div>
      </div>
    </div>
  )
}

export function EmsVoltageTab({
  trendRows,
  hourlyVoltagePoints,
}: {
  trendRows: TrendPoint[]
  hourlyVoltagePoints: HourlyVoltagePoint[]
}) {
  const [page, setPage] = useState(0)
  const pageData = getPagedTrendRows(trendRows, page)
  const latestVRY = metricValueFromLatest(trendRows, "VRY")
  const latestVYB = metricValueFromLatest(trendRows, "VYB")
  const latestVBR = metricValueFromLatest(trendRows, "VBR")
  const latestVRN = metricValueFromLatest(trendRows, "VRN")
  const latestVYN = metricValueFromLatest(trendRows, "VYN")
  const latestVBN = metricValueFromLatest(trendRows, "VBN")
  const lnGaugeMax = dynamicGaugeMax(
    [latestVRN, latestVYN, latestVBN],
    GAUGE_MAX_LN_VOLTAGE
  )
  const llGaugeMax = dynamicGaugeMax(
    [latestVRY, latestVYB, latestVBR],
    GAUGE_MAX_LL_VOLTAGE
  )
  const hourlyAverages = useMemo(
    () =>
      hourlyVoltagePoints.map((point) => ({
        hour: point.hour,
        averageVoltageLL: point.averageVoltageLL,
        averageVoltageLN: point.averageVoltageLN,
      })),
    [hourlyVoltagePoints]
  )
  const hasHourlyData = hourlyVoltagePoints.some(
    (point) =>
      typeof point.averageVoltageLL === "number" ||
      typeof point.averageVoltageLN === "number"
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <section className="grid gap-4 xl:grid-cols-2">
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-sm font-semibold">Latest Phase Voltages - V (LN)</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <VoltageGauge
                label="VRN"
                value={latestVRN}
                max={lnGaugeMax}
                color={phaseColors.red}
              />
              <VoltageGauge
                label="VYN"
                value={latestVYN}
                max={lnGaugeMax}
                color={phaseColors.amber}
              />
              <VoltageGauge
                label="VBN"
                value={latestVBN}
                max={lnGaugeMax}
                color={phaseColors.blue}
              />
            </div>
          </div>
        </article>

        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-sm font-semibold">Latest Phase Voltages - V (LL)</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <VoltageGauge
                label="VRY"
                value={latestVRY}
                max={llGaugeMax}
                color={phaseColors.red}
              />
              <VoltageGauge
                label="VYB"
                value={latestVYB}
                max={llGaugeMax}
                color={phaseColors.amber}
              />
              <VoltageGauge
                label="VBR"
                value={latestVBR}
                max={llGaugeMax}
                color={phaseColors.blue}
              />
            </div>
          </div>
        </article>
      </section>

      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-4">
          <p className="text-sm font-semibold">V (LN)</p>
          <div className="mt-3 h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pageData.rows}>
                <defs>
                  <linearGradient
                    id="voltage-vbn-line"
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
                  dataKey="VRN"
                  stroke={phaseColors.red}
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="VYN"
                  stroke={phaseColors.amber}
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="VBN"
                  stroke="url(#voltage-vbn-line)"
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
          <p className="text-sm font-semibold">V (LL)</p>
          <div className="mt-3 h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pageData.rows}>
                <defs>
                  <linearGradient
                    id="voltage-vbr-line"
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
                  stroke="url(#voltage-vbr-line)"
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
          <p className="mt-2 text-[11px] text-muted-foreground">
            Window: {LOG_WINDOW_SIZE} logs per page
          </p>
        </div>
      </article>

      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-4">
          <p className="text-sm font-semibold">
            Hourly Voltage Breakdown (Last 12 Hours)
          </p>
          <p className="text-xs text-muted-foreground">
            1 hour per bar with averages for V (LN) and V (LL)
          </p>
          <div className="mt-3 h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyAverages}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#cbd5e1"
                  strokeOpacity={0.45}
                />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => {
                    if (typeof value !== "number" || Number.isNaN(value)) {
                      return "-"
                    }
                    return `${formatNumber(value, 2)} V`
                  }}
                />
                <Legend />
                <Bar
                  name="Avg V (LN)"
                  dataKey="averageVoltageLN"
                  fill={phaseColors.cyan}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  name="Avg V (LL)"
                  dataKey="averageVoltageLL"
                  fill={phaseColors.indigo}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!hasHourlyData ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No voltage data available in the last 12 hours for this meter.
            </p>
          ) : null}
        </div>
      </article>
    </motion.div>
  )
}
