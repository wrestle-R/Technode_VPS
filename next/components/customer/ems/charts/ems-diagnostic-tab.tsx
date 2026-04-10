import { motion } from "framer-motion"
import {
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
  chartGradients,
  getPagedTrendRows,
  gradientCardClassName,
  LOG_SCOPE_LIMIT,
  LOG_WINDOW_SIZE,
  metricValueFromLatest,
  phaseColors,
} from "@/components/customer/ems/helpers"
import type { TrendPoint } from "@/components/customer/ems/types"
import { useState } from "react"

export function EmsDiagnosticTab({ trendRows }: { trendRows: TrendPoint[] }) {
  const [page, setPage] = useState(0)
  const pageData = getPagedTrendRows(trendRows, page)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-4 xl:grid-cols-2"
    >
      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-4">
          <p className="text-sm font-semibold">Power Factor by Phase</p>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pageData.rows}>
                <defs>
                  <linearGradient
                    id="diagnostic-pfb-line"
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
                <YAxis domain={[0, 1.1]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="PF-R"
                  stroke={phaseColors.red}
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="PF-Y"
                  stroke={phaseColors.amber}
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="PF-B"
                  stroke="url(#diagnostic-pfb-line)"
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
          <p className="text-sm font-semibold">Power Mix (Latest)</p>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    metric: "kWh",
                    value: metricValueFromLatest(trendRows, "Kwh") ?? 0,
                    color: phaseColors.green,
                  },
                  {
                    metric: "kVAh",
                    value: metricValueFromLatest(trendRows, "KvAh") ?? 0,
                    color: phaseColors.indigo,
                  },
                  {
                    metric: "kVArh",
                    value: metricValueFromLatest(trendRows, "KvArh") ?? 0,
                    color: phaseColors.cyan,
                  },
                ]}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#cbd5e1"
                  strokeOpacity={0.45}
                />
                <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  <Cell fill={phaseColors.green} />
                  <Cell fill={phaseColors.indigo} />
                  <Cell fill={phaseColors.cyan} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Line-chart window: {LOG_WINDOW_SIZE} logs per page
          </p>
        </div>
      </article>
    </motion.div>
  )
}
