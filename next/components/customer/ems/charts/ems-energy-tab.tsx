import { motion } from "framer-motion"
import {
  CartesianGrid,
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
  metricValueFromLatest,
  phaseColors,
} from "@/components/customer/ems/helpers"
import type { TrendPoint } from "@/components/customer/ems/types"

export function EmsEnergyTab({
  trendRows,
  kwhDelta,
}: {
  trendRows: TrendPoint[]
  kwhDelta: number | null
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              kWh Delta
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatNumber(kwhDelta, 3)}
            </p>
            <p className="text-xs text-muted-foreground">
              Computed as max(kWh) - min(kWh) in visible trend window.
            </p>
          </div>
        </article>
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Latest kVAh
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatNumber(metricValueFromLatest(trendRows, "KvAh"), 3)}
            </p>
          </div>
        </article>
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Latest kVArh
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatNumber(metricValueFromLatest(trendRows, "KvArh"), 3)}
            </p>
          </div>
        </article>
      </div>

      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-4">
          <p className="text-sm font-semibold">Cumulative Energy Curves</p>
          <div className="mt-3 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendRows.slice(-60)}>
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
        </div>
      </article>
    </motion.div>
  )
}
