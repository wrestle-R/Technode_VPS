import Image from "next/image"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { CalendarIcon, Download, FileSpreadsheet, FileText } from "lucide-react"
import { useState } from "react"
import type { DateRange } from "react-day-picker"
import {
  Area,
  AreaChart,
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
  LOG_SCOPE_LIMIT,
  LOG_WINDOW_SIZE,
  gradientCardClassName,
  phaseColors,
} from "@/components/customer/ems/helpers"
import type {
  ReportRange,
  ReportType,
  TrendPoint,
} from "@/components/customer/ems/types"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  companyName,
  companyLoginImageUrl,
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
  customStartDate: Date | undefined
  customEndDate: Date | undefined
  onCustomStartDateChange: (date: Date | undefined) => void
  onCustomEndDateChange: (date: Date | undefined) => void
  companyName: string
  companyLoginImageUrl: string
}) {
  const [chartPage, setChartPage] = useState(0)
  const rangeSummary =
    reportRange === "24h"
      ? "Last 24 Hours"
      : reportRange === "7d"
        ? "Last 7 Days"
        : reportRange === "30d"
          ? "Last 30 Days"
          : customStartDate && customEndDate
            ? `${format(customStartDate, "dd MMM yyyy")} - ${format(customEndDate, "dd MMM yyyy")}`
            : "Custom Range"

  const latestTimestamp =
    reportRows.length > 0
      ? new Date(reportRows[reportRows.length - 1]?.timestamp ?? "").toLocaleString()
      : "--"

  const reportTypeLabel =
    reportType === "raw"
      ? "Raw Data Report"
      : reportType === "analytical"
        ? "Analytical Report"
        : "Consumption & Cost"

  const selectedRange: DateRange | undefined =
    customStartDate || customEndDate
      ? {
          from: customStartDate,
          to: customEndDate,
        }
      : undefined

  const scopedRows = reportRows.slice(-LOG_SCOPE_LIMIT)
  const totalPages = Math.max(1, Math.ceil(scopedRows.length / LOG_WINDOW_SIZE))
  const activePage = Math.min(Math.max(chartPage, 0), totalPages - 1)
  const end = scopedRows.length - activePage * LOG_WINDOW_SIZE
  const start = Math.max(end - LOG_WINDOW_SIZE, 0)
  const pagedRows = scopedRows.slice(start, end)

  const chartRows = pagedRows.map((row) => {
    const at = new Date(row.timestamp)
    const reportLabel =
      reportRange === "24h"
        ? at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : at.toLocaleString([], {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })

    return {
      ...row,
      reportLabel,
    }
  })

  return (
    <div className="space-y-6">
      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Device Report Generator
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{unitId}</h1>
              <p className="text-sm text-muted-foreground">Last updated: {latestTimestamp}</p>
            </div>
            <div className="flex items-center gap-3">
              {companyLoginImageUrl ? (
                <div className="h-14 w-28 overflow-hidden rounded-xl border border-border/70 bg-white p-2">
                  <Image
                    src={companyLoginImageUrl}
                    alt={companyName || "Company"}
                    width={112}
                    height={56}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                </div>
              ) : null}
              <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-right">
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="text-sm font-semibold">{companyName || "Technode"}</p>
              </div>
            </div>
          </div>
        </div>
      </article>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 xl:grid-cols-4"
      >
        <article className={gradientCardClassName("xl:col-span-3")}>
          <div className="space-y-5 rounded-[15px] bg-card p-4">
            <p className="text-sm font-semibold">Report Configuration</p>

            <div className="grid gap-3 lg:grid-cols-3">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Device / Meter</span>
                <select
                  className="h-10 rounded-xl border border-input bg-white/90 px-3"
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

              <label className="grid gap-2 text-sm">
                <span className="font-medium">Date Range</span>
                <select
                  value={reportRange}
                  onChange={(event) =>
                    onReportRangeChange(event.target.value as ReportRange)
                  }
                  className="h-10 rounded-xl border border-input bg-white/90 px-3"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium">Report Type</span>
                <select
                  value={reportType}
                  onChange={(event) =>
                    onReportTypeChange(event.target.value as ReportType)
                  }
                  className="h-10 rounded-xl border border-input bg-white/90 px-3"
                >
                  <option value="raw">Raw Data Report</option>
                  <option value="analytical">Analytical Report</option>
                  <option value="consumption">Consumption & Cost</option>
                </select>
              </label>
            </div>

            <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-semibold">Quick Date Range Selection</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { key: "24h" as const, label: "Last 24 Hours" },
                  { key: "7d" as const, label: "Last 7 Days" },
                  { key: "30d" as const, label: "Last 30 Days" },
                  { key: "custom" as const, label: "Custom Range" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onReportRangeChange(item.key)}
                    className={
                      reportRange === item.key
                        ? "h-10 rounded-xl bg-[#2b3242] text-xs font-semibold tracking-[0.12em] text-white uppercase shadow-[0_20px_30px_-20px_rgba(43,50,66,0.9)]"
                        : "h-10 rounded-xl border border-border bg-white/90 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase transition hover:bg-white"
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {reportRange === "custom" ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-white px-3 text-sm"
                    >
                      <span>
                        {customStartDate
                          ? customEndDate
                            ? `${format(customStartDate, "dd MMM yyyy")} - ${format(customEndDate, "dd MMM yyyy")}`
                            : format(customStartDate, "dd MMM yyyy")
                          : "Pick a date range"}
                      </span>
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="range"
                      numberOfMonths={2}
                      selected={selectedRange}
                      onSelect={(range) => {
                        onCustomStartDateChange(range?.from)
                        onCustomEndDateChange(range?.to)
                        onReportRangeChange("custom")
                      }}
                    />
                  </PopoverContent>
                </Popover>
              ) : null}
            </div>

            <div className="h-80 rounded-2xl border border-border/70 bg-white/80 p-2">
              <ResponsiveContainer width="100%" height="100%">
                {reportType === "consumption" ? (
                  <AreaChart data={chartRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                    <XAxis dataKey="reportLabel" tick={{ fontSize: 11 }} minTickGap={28} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="Kwh" stroke={phaseColors.green} fill={phaseColors.green} fillOpacity={0.2} />
                    <Area type="monotone" dataKey="KvAh" stroke={phaseColors.indigo} fill={phaseColors.indigo} fillOpacity={0.18} />
                    <Area type="monotone" dataKey="KvArh" stroke={phaseColors.cyan} fill={phaseColors.cyan} fillOpacity={0.16} />
                  </AreaChart>
                ) : (
                  <LineChart data={chartRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                    <XAxis dataKey="reportLabel" tick={{ fontSize: 11 }} minTickGap={28} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {reportType === "raw" ? (
                      <>
                        <Line type="monotone" dataKey="Kwh" stroke={phaseColors.green} dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="KW-R" stroke={phaseColors.red} dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="KW-Y" stroke={phaseColors.amber} dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="KW-B" stroke={phaseColors.blue} dot={false} strokeWidth={2} />
                      </>
                    ) : (
                      <>
                        <Line type="monotone" dataKey="VRY" stroke={phaseColors.red} dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="IR" stroke={phaseColors.indigo} dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="PF-R" stroke={phaseColors.amber} dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="Freq" stroke={phaseColors.cyan} dot={false} strokeWidth={2} />
                      </>
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <p>
                Showing logs {scopedRows.length === 0 ? 0 : start + 1}-{end} of {scopedRows.length} (last {LOG_SCOPE_LIMIT})
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChartPage((prev) => Math.min(prev + 1, totalPages - 1))}
                  disabled={activePage >= totalPages - 1}
                  className="h-8 rounded-lg border border-border bg-white px-3 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setChartPage((prev) => Math.max(prev - 1, 0))}
                  disabled={activePage === 0}
                  className="h-8 rounded-lg border border-border bg-white px-3 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Window: {LOG_WINDOW_SIZE} logs per page</p>
          </div>
        </article>

        <article className={gradientCardClassName()}>
          <div className="space-y-3 rounded-[15px] bg-card p-4">
            <p className="text-sm font-semibold">Current Settings</p>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">Date Range</p>
              <p className="mt-1 font-semibold">{rangeSummary}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">Report Type</p>
              <p className="mt-1 font-semibold">{reportTypeLabel}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                Rows in Range
              </p>
              <p className="mt-1 text-lg font-semibold">{reportRows.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                Total kWh Delta
              </p>
              <p className="mt-1 text-lg font-semibold">{formatNumber(kwhDelta, 3)}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                Latest Frequency
              </p>
              <p className="mt-1 text-lg font-semibold">
                {formatNumber(frequency, 2)} Hz
              </p>
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={onExportCsv}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-white/90 text-xs font-semibold tracking-[0.12em] uppercase transition hover:bg-white"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download CSV
              </button>
              <button
                type="button"
                onClick={onExportPdf}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2b3242] text-xs font-semibold tracking-[0.12em] text-white uppercase shadow-[0_20px_30px_-20px_rgba(43,50,66,0.9)]"
              >
                <FileText className="h-4 w-4" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={onExportPdf}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase"
              >
                <Download className="h-4 w-4" />
                Print Report
              </button>
            </div>
          </div>
        </article>
      </motion.div>
    </div>
  )
}
