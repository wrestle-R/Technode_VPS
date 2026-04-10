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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  formatNumber,
  gradientCardClassName,
  phaseColors,
} from "@/components/customer/ems/helpers"
import type { ReportRange } from "@/components/customer/ems/types"
import type { TrendPoint } from "@/components/customer/ems/types"

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

type StatSeries = {
  max: number | null
  min: number | null
  avg: number | null
}

type SummaryStats = {
  voltage: StatSeries
  current: StatSeries
  power: StatSeries
  powerFactor: StatSeries
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
  onSummaryRangeChange: (nextRange: Extract<ReportRange, "24h" | "7d" | "30d">) => void
}) {
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

  const latestRows = trendRows.slice(-72)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Voltage-LL
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {formatNumber(snapshot.voltageLL, 1)} V
            </p>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>R: {formatNumber(snapshot.voltageR, 1)}V</p>
              <p>Y: {formatNumber(snapshot.voltageY, 1)}V</p>
              <p>B: {formatNumber(snapshot.voltageB, 1)}V</p>
            </div>
          </div>
        </article>
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Current
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {formatNumber(snapshot.currentTotal, 1)} A
            </p>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>R: {formatNumber(snapshot.currentR, 1)}A</p>
              <p>Y: {formatNumber(snapshot.currentY, 1)}A</p>
              <p>B: {formatNumber(snapshot.currentB, 1)}A</p>
            </div>
          </div>
        </article>
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Power Factor
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {formatNumber(snapshot.powerFactorAvg, 2)}
            </p>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>R: {formatNumber(snapshot.powerFactorR, 2)}</p>
              <p>Y: {formatNumber(snapshot.powerFactorY, 2)}</p>
              <p>B: {formatNumber(snapshot.powerFactorB, 2)}</p>
            </div>
          </div>
        </article>
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Frequency
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {formatNumber(snapshot.frequency, 2)} Hz
            </p>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="VRY" stroke={phaseColors.red} dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="VYB" stroke={phaseColors.amber} dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="VBR" stroke={phaseColors.blue} dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="IR" stroke="#7c3aed" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="IY" stroke="#0ea5e9" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="IB" stroke="#0891b2" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-sm font-semibold">Power Factor + Frequency Health</p>
            <div className="mt-3 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latestRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
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
                    stroke={phaseColors.blue}
                    fill={phaseColors.blue}
                    fillOpacity={0.2}
                  />
                  <Line type="monotone" dataKey="Freq" stroke="#0f766e" dot={false} strokeWidth={2} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                  <XAxis dataKey="phase" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="voltage" name="Voltage (V)" radius={[8, 8, 0, 0]}>
                    <Cell fill={phaseColors.red} />
                    <Cell fill={phaseColors.amber} />
                    <Cell fill={phaseColors.blue} />
                  </Bar>
                  <Bar dataKey="current" name="Current (A)" radius={[8, 8, 0, 0]}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Kwh" stroke={phaseColors.green} dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="KvAh" stroke={phaseColors.indigo} dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="KvArh" stroke={phaseColors.cyan} dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>
      </section>

      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">Statistical Summary</p>
              <p className="text-sm text-muted-foreground">Dynamic range analytics</p>
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
                      ? "h-9 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-3 text-[11px] font-semibold tracking-[0.1em] text-white uppercase"
                      : "h-9 rounded-xl border border-border bg-white px-3 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase"
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-emerald-200/70 bg-linear-to-b from-emerald-50 to-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-emerald-900">Voltage (V)</p>
              <div className="mt-3 space-y-2">
                <p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Maximum</span><span className="font-semibold">{formatNumber(summary.voltage.max, 2)} V</span></p>
                <p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Minimum</span><span className="font-semibold">{formatNumber(summary.voltage.min, 2)} V</span></p>
                <p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Average</span><span className="font-semibold">{formatNumber(summary.voltage.avg, 2)} V</span></p>
              </div>
            </div>
            <div className="rounded-2xl border border-teal-200/70 bg-linear-to-b from-teal-50 to-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-teal-900">Current (A)</p>
              <div className="mt-3 space-y-2">
                <p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Maximum</span><span className="font-semibold">{formatNumber(summary.current.max, 2)} A</span></p>
                <p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Minimum</span><span className="font-semibold">{formatNumber(summary.current.min, 2)} A</span></p>
                <p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Average</span><span className="font-semibold">{formatNumber(summary.current.avg, 2)} A</span></p>
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-200/70 bg-linear-to-b from-cyan-50 to-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-cyan-900">Power (kW)</p>
              <div className="mt-3 space-y-2">
                <p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Maximum</span><span className="font-semibold">{formatNumber(summary.power.max, 2)} kW</span></p>
                <p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Minimum</span><span className="font-semibold">{formatNumber(summary.power.min, 2)} kW</span></p>
                <p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Average</span><span className="font-semibold">{formatNumber(summary.power.avg, 2)} kW</span></p>
              </div>
            </div>
            <div className="rounded-2xl border border-lime-200/70 bg-linear-to-b from-lime-50 to-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-lime-900">Power Factor</p>
              <div className="mt-3 space-y-2">
                <p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Maximum</span><span className="font-semibold">{formatNumber(summary.powerFactor.max, 3)}</span></p>
                <p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Minimum</span><span className="font-semibold">{formatNumber(summary.powerFactor.min, 3)}</span></p>
                <p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Average</span><span className="font-semibold">{formatNumber(summary.powerFactor.avg, 3)}</span></p>
              </div>
            </div>
          </div>
        </div>
      </article>
    </motion.div>
  )
}
