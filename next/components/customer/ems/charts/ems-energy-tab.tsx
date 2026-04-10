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
  getPagedTrendRows,
  gradientCardClassName,
  LOG_SCOPE_LIMIT,
  LOG_WINDOW_SIZE,
  metricValueFromLatest,
  phaseColors,
} from "@/components/customer/ems/helpers"
import type { TrendPoint } from "@/components/customer/ems/types"
import { useState } from "react"

export function EmsEnergyTab({
  trendRows,
  kwhDelta,
}: {
  trendRows: TrendPoint[]
  kwhDelta: number | null
}) {
  const [page, setPage] = useState(0)
  const pageData = getPagedTrendRows(trendRows, page)

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
              <LineChart data={pageData.rows}>
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
              Showing logs {pageData.from}-{pageData.to} of {pageData.total} (last {LOG_SCOPE_LIMIT})
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(prev + 1, pageData.totalPages - 1))}
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
            Window: {LOG_WINDOW_SIZE} logs per page
          </p>
        </div>
      </article>
    </motion.div>
  )
}
