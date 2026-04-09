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
  phaseColors,
  reportsGradientCardClassName,
} from "@/components/customer/ems/helpers"
import type {
  ReportRange,
  ReportType,
  TrendPoint,
} from "@/components/customer/ems/types"

export function EmsReportsPanel({
  unitId,
  effectiveRtuKey,
  availableRtus,
  onRtuChange,
  reportRange,
  reportType,
  onReportRangeChange,
  onReportTypeChange,
  onExportCsv,
  onExportPdf,
  reportRows,
  kwhDelta,
  frequency,
}: {
  unitId: string
  effectiveRtuKey: string
  availableRtus: Array<{ rtuKey: string; nickname: string }>
  onRtuChange: (nextRtuKey: string) => void
  reportRange: ReportRange
  reportType: ReportType
  onReportRangeChange: (nextRange: ReportRange) => void
  onReportTypeChange: (nextType: ReportType) => void
  onExportCsv: () => void
  onExportPdf: () => void
  reportRows: TrendPoint[]
  kwhDelta: number | null
  frequency: number | null
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{unitId}</h1>
          <p className="text-sm text-muted-foreground">
            Generate raw, analytical, and consumption-focused reports.
          </p>
        </div>
        <label className="grid gap-2 text-sm sm:min-w-56">
          <span className="font-medium">Meter</span>
          <select
            className="h-10 rounded-xl border border-input bg-background px-3"
            value={effectiveRtuKey}
            onChange={(event) => onRtuChange(event.target.value)}
          >
            {availableRtus.map((rtu) => (
              <option key={rtu.rtuKey} value={rtu.rtuKey}>
                {rtu.nickname}
              </option>
            ))}
          </select>
        </label>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 xl:grid-cols-3"
      >
        <article className={reportsGradientCardClassName("xl:col-span-2")}>
          <div className="space-y-4 rounded-[15px] bg-card p-4">
            <p className="text-sm font-semibold">Report Configuration</p>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Date Range</span>
                <select
                  value={reportRange}
                  onChange={(event) =>
                    onReportRangeChange(event.target.value as ReportRange)
                  }
                  className="h-10 rounded-xl border border-input bg-background px-3"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium">Report Type</span>
                <select
                  value={reportType}
                  onChange={(event) =>
                    onReportTypeChange(event.target.value as ReportType)
                  }
                  className="h-10 rounded-xl border border-input bg-background px-3"
                >
                  <option value="raw">Raw Data Report</option>
                  <option value="analytical">Analytical Report</option>
                  <option value="consumption">Consumption and Cost</option>
                </select>
              </label>

              <div className="grid gap-2 text-sm">
                <span className="font-medium">Export</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onExportCsv}
                    className="h-10 flex-1 rounded-xl border border-border bg-card text-xs font-semibold tracking-[0.12em] uppercase"
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={onExportPdf}
                    className="h-10 flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-semibold tracking-[0.12em] text-white uppercase"
                  >
                    PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportRows.slice(-50)}>
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
                    dataKey="KW-R"
                    stroke={phaseColors.red}
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="KW-Y"
                    stroke={phaseColors.amber}
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="KW-B"
                    stroke={phaseColors.blue}
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className={reportsGradientCardClassName()}>
          <div className="space-y-3 rounded-[15px] bg-card p-4">
            <p className="text-sm font-semibold">Computed Summary</p>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                Total kWh Delta
              </p>
              <p className="mt-1 text-lg font-semibold">
                {formatNumber(kwhDelta, 3)}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                Rows in Range
              </p>
              <p className="mt-1 text-lg font-semibold">{reportRows.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                Latest Frequency
              </p>
              <p className="mt-1 text-lg font-semibold">
                {formatNumber(frequency, 2)} Hz
              </p>
            </div>
          </div>
        </article>
      </motion.div>
    </div>
  )
}
