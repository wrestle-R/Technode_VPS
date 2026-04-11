import { motion } from "framer-motion"
import {
  Bar,
  BarChart,
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
  phaseColors,
} from "@/components/customer/ems/helpers"
import type {
  EnergyAnalytics,
  EnergyDailyRange,
} from "@/components/customer/ems/types"

export function EmsEnergyTab({
  analytics,
  dailyRange,
  onDailyRangeChange,
  isLoading,
}: {
  analytics: EnergyAnalytics | null
  dailyRange: EnergyDailyRange
  onDailyRangeChange: (range: EnergyDailyRange) => void
  isLoading: boolean
}) {
  const cumulativeAxisFormatter = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
  })
  const cumulativeTooltipFormatter = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

  const monthlyCumulative = analytics?.monthlyCumulative ?? []
  const dailyConsumption = analytics?.dailyConsumption ?? []
  const monthlyAverage = analytics?.monthlyAverage ?? []
  const hourlyConsumption = analytics?.hourlyConsumption ?? []
  const monthTotal =
    monthlyCumulative.length > 0
      ? monthlyCumulative[monthlyCumulative.length - 1]?.kwh ?? null
      : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Month Cumulative kWh
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatNumber(monthTotal, 3)}
            </p>
            <p className="text-xs text-muted-foreground">
              Cumulative growth for the current month. Negative resets are ignored.
            </p>
          </div>
        </article>
        <article className={gradientCardClassName()}>
          <div className="rounded-[15px] bg-card p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Data Points
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {monthlyCumulative.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Refreshing analytics..." : "Current month trend samples."}
            </p>
          </div>
        </article>
      </div>

      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-4">
          <p className="text-sm font-semibold">Hourly Energy Breakdown (Rolling 24 Hours)</p>
          <div className="mt-3 h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyConsumption}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#cbd5e1"
                  strokeOpacity={0.45}
                />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={12} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  name="kWh/hour"
                  dataKey="consumption"
                  fill={phaseColors.cyan}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </article>

      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">Daily Energy Consumption</p>
            <label className="text-xs font-medium text-muted-foreground">
              <span className="mr-2">Last</span>
              <select
                className="h-9 rounded-lg border border-input bg-white px-3 text-xs"
                value={dailyRange}
                onChange={(event) =>
                  onDailyRangeChange(event.target.value as EnergyDailyRange)
                }
              >
                <option value="3d">3 Days</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
              </select>
            </label>
          </div>
          <div className="mt-3 h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyConsumption}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#cbd5e1"
                  strokeOpacity={0.45}
                />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  name="kWh/day"
                  dataKey="consumption"
                  fill={phaseColors.blue}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </article>

      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-4">
          <p className="text-sm font-semibold">Monthly Average Consumption (Last 3 Months)</p>
          <div className="mt-3 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyAverage}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#cbd5e1"
                  strokeOpacity={0.45}
                />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  name="Avg kWh/day"
                  dataKey="averageConsumption"
                  fill={phaseColors.indigo}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </article>

      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-4">
          <p className="text-sm font-semibold">Cumulative kWh (Current Month)</p>
          <div className="mt-3 h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyCumulative}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#cbd5e1"
                  strokeOpacity={0.45}
                />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 11 }}
                  minTickGap={26}
                  tickFormatter={(value) => {
                    const parsed = new Date(String(value))
                    return Number.isNaN(parsed.getTime())
                      ? ""
                      : cumulativeAxisFormatter.format(parsed)
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(value) => {
                    const parsed = new Date(String(value))
                    return Number.isNaN(parsed.getTime())
                      ? ""
                      : cumulativeTooltipFormatter.format(parsed)
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  name="kWh"
                  dataKey="kwh"
                  stroke={phaseColors.green}
                  dot={false}
                  strokeWidth={2.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Monotonic cumulative curve based on current-month kWh logs.
          </p>
        </div>
      </article>
    </motion.div>
  )
}
