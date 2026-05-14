import Image from "next/image"
import { format } from "date-fns"
import { motion } from "framer-motion"
import {
  CalendarIcon,
  Download,
  FileSpreadsheet,
  FileText,
  IndianRupee,
} from "lucide-react"
import { useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
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
import {
  buildAnalyticalReportModel,
  buildConsumptionReportModel,
  buildRawReportModel,
  consumptionRangeLabel,
  reportDateRangeLabel,
  reportTypeTitle,
} from "@/components/customer/ems/reports/report-export"
import type {
  ConsumptionRange,
  ReportExportFormat,
  ReportRange,
  ReportType,
  TrendPoint,
} from "@/components/customer/ems/types"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

function reportRangeLabel({
  reportRange,
  customStartDate,
  customEndDate,
}: {
  reportRange: ReportRange
  customStartDate: Date | undefined
  customEndDate: Date | undefined
}) {
  if (reportRange === "24h") {
    return "Last 24 Hours"
  }
  if (reportRange === "7d") {
    return "Last 7 Days"
  }
  if (reportRange === "30d") {
    return "Last 30 Days"
  }
  if (customStartDate && customEndDate) {
    return `${format(customStartDate, "dd MMM yyyy")} - ${format(customEndDate, "dd MMM yyyy")}`
  }
  return "Custom Range"
}

export function EmsReportsPanel({
  unitDisplayName,
  effectiveMeterKey,
  availableMeters,
  onMeterChange,
  reportRange,
  reportType,
  onReportRangeChange,
  onReportTypeChange,
  onExport,
  reportRows,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  companyName,
  companyLoginImageUrl,
  consumptionRange,
  onConsumptionRangeChange,
  unitPrice,
  onUnitPriceChange,
  reportRowsInRangeCount,
  isReportRowsInRangeCountLoading,
}: {
  unitDisplayName: string
  effectiveMeterKey: string
  availableMeters: Array<{ meterKey: string; name: string }>
  onMeterChange: (nextMeterKey: string) => void
  reportRange: ReportRange
  reportType: ReportType
  onReportRangeChange: (nextRange: ReportRange) => void
  onReportTypeChange: (nextType: ReportType) => void
  onExport: (format: ReportExportFormat) => void
  reportRows: TrendPoint[]
  customStartDate: Date | undefined
  customEndDate: Date | undefined
  onCustomStartDateChange: (date: Date | undefined) => void
  onCustomEndDateChange: (date: Date | undefined) => void
  companyName: string
  companyLoginImageUrl: string
  consumptionRange: ConsumptionRange
  onConsumptionRangeChange: (range: ConsumptionRange) => void
  unitPrice: number
  onUnitPriceChange: (value: number) => void
  reportRowsInRangeCount: number | null
  isReportRowsInRangeCountLoading: boolean
}) {
  const [exportFormat, setExportFormat] = useState<ReportExportFormat>("csv")

  const selectedRange: DateRange | undefined =
    customStartDate || customEndDate
      ? {
          from: customStartDate,
          to: customEndDate,
        }
      : undefined

  const latestTimestamp =
    reportRows.length > 0
      ? new Date(reportRows[reportRows.length - 1]?.timestamp ?? "").toLocaleString()
      : "--"

  const rangeSummary = reportRangeLabel({
    reportRange,
    customStartDate,
    customEndDate,
  })

  const rawReport = useMemo(() => buildRawReportModel(reportRows), [reportRows])
  const analyticalReport = useMemo(
    () => buildAnalyticalReportModel(reportRows),
    [reportRows]
  )
  const consumptionReport = useMemo(
    () =>
      buildConsumptionReportModel({
        rows: reportRows,
        mode: consumptionRange,
        unitPrice,
      }),
    [consumptionRange, reportRows, unitPrice]
  )

  const totalEnergyDelta =
    rawReport.rows.length > 1
      ? Math.max(
          (rawReport.rows[rawReport.rows.length - 1]?.kwh ?? 0) -
            (rawReport.rows[0]?.kwh ?? 0),
          0
        )
      : null

  const latestFrequency = rawReport.rows[rawReport.rows.length - 1]?.frequency ?? null

  const rawChartRows = useMemo(
    () =>
      rawReport.previewRows.map((row) => {
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
          periodLabel: reportLabel,
          kwh: row.kwh,
          kwR: row.kwR,
          kwY: row.kwY,
          kwB: row.kwB,
        }
      }),
    [rawReport.previewRows, reportRange]
  )

  const analyticalChartRows = useMemo(
    () =>
      analyticalReport.rows.map((row) => ({
        periodLabel: row.periodLabel,
        energyKwh: Number(row.energyKwh.toFixed(3)),
        maxLoadKw: Number(row.maxLoadKw.toFixed(2)),
        avgPf: Number(row.avgPf.toFixed(3)),
        peakCurrentA: Number(row.peakCurrentA.toFixed(2)),
        maxVoltageV: Number(row.maxVoltageV.toFixed(1)),
      })),
    [analyticalReport.rows]
  )

  const consumptionChartRows = useMemo(
    () =>
      consumptionReport.rows.map((row) => ({
        periodLabel: row.periodLabel,
        energyKwh: Number(row.energyKwh.toFixed(3)),
        costInr: Number(row.costInr.toFixed(2)),
      })),
    [consumptionReport.rows]
  )

  const activeDateRangeLabel =
    reportType === "consumption"
      ? consumptionRangeLabel(consumptionRange)
      : reportDateRangeLabel(reportRows)

  const rowsInRangeValue =
    reportType !== "consumption" && reportRowsInRangeCount != null
      ? String(reportRowsInRangeCount)
      : String(reportRows.length)

  return (
    <div className="space-y-6">
      <article className={gradientCardClassName()}>
        <div className="rounded-[15px] bg-card p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                EMS Reports
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{unitDisplayName}</h1>
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
                  value={effectiveMeterKey}
                  onChange={(event) => onMeterChange(event.target.value)}
                >
                  {availableMeters.map((meter) => (
                    <option key={meter.meterKey} value={meter.meterKey}>
                      {meter.name}
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
                  disabled={reportType === "consumption"}
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

            {reportType !== "consumption" ? (
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
            ) : (
              <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Consumption Time Range</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { key: "daily" as const, label: "Daily" },
                      { key: "weekly" as const, label: "Weekly" },
                      { key: "monthly" as const, label: "Monthly" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => onConsumptionRangeChange(item.key)}
                        className={
                          consumptionRange === item.key
                            ? "h-10 rounded-xl bg-[#2b3242] text-xs font-semibold tracking-[0.12em] text-white uppercase shadow-[0_20px_30px_-20px_rgba(43,50,66,0.9)]"
                            : "h-10 rounded-xl border border-border bg-white/90 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase transition hover:bg-white"
                        }
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-border/70 bg-white/80 p-3">
                  <p className="text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                    Unit Price
                  </p>
                  <label className="flex h-10 items-center gap-2 rounded-lg border border-input bg-white px-3">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={Number.isFinite(unitPrice) ? unitPrice : 0}
                      onChange={(event) => onUnitPriceChange(Number(event.target.value))}
                      className="w-full bg-transparent text-sm outline-none"
                    />
                    <span className="text-xs text-muted-foreground">/kWh</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Applied to all consumption buckets for cost computation.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-semibold">Export Format</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setExportFormat("csv")}
                  className={
                    exportFormat === "csv"
                      ? "flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2b3242] text-xs font-semibold tracking-[0.12em] text-white uppercase shadow-[0_20px_30px_-20px_rgba(43,50,66,0.9)]"
                      : "flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white/90 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase transition hover:bg-white"
                  }
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("pdf")}
                  className={
                    exportFormat === "pdf"
                      ? "flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2b3242] text-xs font-semibold tracking-[0.12em] text-white uppercase shadow-[0_20px_30px_-20px_rgba(43,50,66,0.9)]"
                      : "flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white/90 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase transition hover:bg-white"
                  }
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </button>
              </div>
            </div>

            <div className="h-96 rounded-2xl border border-border/70 bg-white/80 p-2">
              <ResponsiveContainer width="100%" height="100%">
                {reportType === "consumption" ? (
                  <BarChart data={consumptionChartRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                    <XAxis dataKey="periodLabel" tick={{ fontSize: 11 }} minTickGap={12} />
                    <YAxis yAxisId="energy" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="energy" dataKey="energyKwh" name="Energy (kWh)" fill={phaseColors.green} radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="cost" dataKey="costInr" name="Cost (INR)" fill={phaseColors.indigo} radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : reportType === "analytical" ? (
                  <LineChart data={analyticalChartRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                    <XAxis dataKey="periodLabel" tick={{ fontSize: 11 }} minTickGap={12} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="energyKwh" name="Energy (kWh)" stroke={phaseColors.green} dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="maxLoadKw" name="Max Load (kW)" stroke={phaseColors.red} dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="avgPf" name="Avg PF" stroke={phaseColors.amber} dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="peakCurrentA" name="Peak Current (A)" stroke={phaseColors.indigo} dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="maxVoltageV" name="Max Voltage (V)" stroke={phaseColors.cyan} dot={false} strokeWidth={2} />
                  </LineChart>
                ) : (
                  <LineChart data={rawChartRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                    <XAxis dataKey="periodLabel" tick={{ fontSize: 11 }} minTickGap={28} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="kwh" name="kWh" stroke={phaseColors.green} dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="kwR" name="kW-R" stroke={phaseColors.red} dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="kwY" name="kW-Y" stroke={phaseColors.amber} dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="kwB" name="kW-B" stroke={phaseColors.blue} dot={false} strokeWidth={2} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className={gradientCardClassName()}>
          <div className="space-y-3 rounded-[15px] bg-card p-4">
            <p className="text-sm font-semibold">Current Settings</p>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">Date Range</p>
              <p className="mt-1 font-semibold">
                {reportType === "consumption"
                  ? consumptionRangeLabel(consumptionRange)
                  : rangeSummary}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">Report Type</p>
              <p className="mt-1 font-semibold">{reportTypeTitle(reportType)}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                Rows in Range
              </p>
              <p className="mt-1 text-lg font-semibold">
                {isReportRowsInRangeCountLoading && reportType !== "consumption"
                  ? "Loading..."
                  : rowsInRangeValue}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                Total kWh Delta
              </p>
              <p className="mt-1 text-lg font-semibold">{formatNumber(totalEnergyDelta, 3)}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                Latest Frequency
              </p>
              <p className="mt-1 text-lg font-semibold">
                {formatNumber(latestFrequency, 2)} Hz
              </p>
            </div>
            {reportType === "consumption" ? (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Unit Price
                </p>
                <p className="mt-1 text-lg font-semibold">
                  INR {Number.isFinite(unitPrice) ? unitPrice.toFixed(2) : "0.00"}/kWh
                </p>
              </div>
            ) : null}
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => onExport(exportFormat)}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2b3242] text-xs font-semibold tracking-[0.12em] text-white uppercase shadow-[0_20px_30px_-20px_rgba(43,50,66,0.9)]"
              >
                {exportFormat === "csv" ? (
                  <FileSpreadsheet className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Download Report
              </button>
              <button
                type="button"
                onClick={() => onExport("pdf")}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase"
              >
                <Download className="h-4 w-4" />
                Print Report
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Export range: {activeDateRangeLabel}
            </p>
          </div>
        </article>
      </motion.div>

      <article className={gradientCardClassName()}>
        <div className="space-y-4 rounded-[15px] bg-card p-4">
          {reportType === "raw" ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                    Total Records
                  </p>
                  <p className="mt-1 text-lg font-semibold">{rawReport.rows.length}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                    Date Range
                  </p>
                  <p className="mt-1 text-sm font-semibold">{activeDateRangeLabel}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                    Unit
                  </p>
                  <p className="mt-1 text-sm font-semibold">{unitDisplayName}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3">
                  <p className="text-xs text-muted-foreground">Avg Energy</p>
                  <p className="mt-1 text-lg font-semibold">{formatNumber(rawReport.avgEnergy, 2)} kWh</p>
                </div>
                <div className="rounded-xl border border-blue-200/70 bg-blue-50/40 p-3">
                  <p className="text-xs text-muted-foreground">Max Energy</p>
                  <p className="mt-1 text-lg font-semibold">{formatNumber(rawReport.maxEnergy, 2)} kWh</p>
                </div>
                <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-3">
                  <p className="text-xs text-muted-foreground">Avg Voltage</p>
                  <p className="mt-1 text-lg font-semibold">{formatNumber(rawReport.avgVoltage, 1)} V</p>
                </div>
                <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3">
                  <p className="text-xs text-muted-foreground">Avg Current</p>
                  <p className="mt-1 text-lg font-semibold">{formatNumber(rawReport.avgCurrent, 2)} A</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border/70">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-2 py-2 font-semibold">Timestamp</th>
                      <th className="px-2 py-2 font-semibold">kWh</th>
                      <th className="px-2 py-2 font-semibold">kVAh</th>
                      <th className="px-2 py-2 font-semibold">kVArh</th>
                      <th className="px-2 py-2 font-semibold">V_RN</th>
                      <th className="px-2 py-2 font-semibold">V_YN</th>
                      <th className="px-2 py-2 font-semibold">V_BN</th>
                      <th className="px-2 py-2 font-semibold">V_RY</th>
                      <th className="px-2 py-2 font-semibold">V_YB</th>
                      <th className="px-2 py-2 font-semibold">V_BR</th>
                      <th className="px-2 py-2 font-semibold">I_R</th>
                      <th className="px-2 py-2 font-semibold">I_Y</th>
                      <th className="px-2 py-2 font-semibold">I_B</th>
                      <th className="px-2 py-2 font-semibold">kW_R</th>
                      <th className="px-2 py-2 font-semibold">kW_Y</th>
                      <th className="px-2 py-2 font-semibold">kW_B</th>
                      <th className="px-2 py-2 font-semibold">PF_R</th>
                      <th className="px-2 py-2 font-semibold">PF_Y</th>
                      <th className="px-2 py-2 font-semibold">PF_B</th>
                      <th className="px-2 py-2 font-semibold">Freq</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawReport.previewRows.map((row) => (
                      <tr key={`${row.timestamp}-${row.kwh ?? "na"}`} className="border-t border-border/70">
                        <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                          {new Date(row.timestamp).toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5">{formatNumber(row.kwh, 2)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.kvah, 2)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.kvarh, 2)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.voltageRn, 1)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.voltageYn, 1)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.voltageBn, 1)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.voltageRy, 1)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.voltageYb, 1)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.voltageBr, 1)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.currentR, 2)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.currentY, 2)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.currentB, 2)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.kwR, 2)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.kwY, 2)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.kwB, 2)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.pfR, 3)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.pfY, 3)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.pfB, 3)}</td>
                        <td className="px-2 py-1.5">{formatNumber(row.frequency, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                Preview is limited to latest 50 rows. CSV export includes all rows in the selected range.
              </p>
            </>
          ) : null}

          {reportType === "analytical" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Analysis Periods</p>
                  <p className="mt-1 text-lg font-semibold">
                    {analyticalReport.summary.periodCount}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Total Energy</p>
                  <p className="mt-1 text-lg font-semibold">
                    {analyticalReport.summary.totalEnergyKwh.toFixed(2)} kWh
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Peak Load Overall</p>
                  <p className="mt-1 text-lg font-semibold">
                    {analyticalReport.summary.peakCurrentOverallA.toFixed(2)} A
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Average PF</p>
                  <p className="mt-1 text-lg font-semibold">
                    {analyticalReport.summary.averagePf.toFixed(3)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border/70">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Period</th>
                      <th className="px-3 py-2 font-semibold">kWh</th>
                      <th className="px-3 py-2 font-semibold">Max Load (kW)</th>
                      <th className="px-3 py-2 font-semibold">Avg PF</th>
                      <th className="px-3 py-2 font-semibold">Peak Current (A)</th>
                      <th className="px-3 py-2 font-semibold">Max Voltage (V)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticalReport.rows.map((row) => (
                      <tr key={row.periodKey} className="border-t border-border/70">
                        <td className="px-3 py-1.5 text-muted-foreground">{row.periodLabel}</td>
                        <td className="px-3 py-1.5">{row.energyKwh.toFixed(2)}</td>
                        <td className="px-3 py-1.5">{row.maxLoadKw.toFixed(2)}</td>
                        <td className="px-3 py-1.5">{row.avgPf.toFixed(3)}</td>
                        <td className="px-3 py-1.5">{row.peakCurrentA.toFixed(2)}</td>
                        <td className="px-3 py-1.5">{row.maxVoltageV.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {reportType === "consumption" ? (
            <>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Time Period</p>
                    <p className="mt-1 font-semibold">{consumptionReport.summary.timePeriodLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Energy</p>
                    <p className="mt-1 font-semibold">
                      {consumptionReport.summary.totalEnergyKwh.toFixed(2)} kWh
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="mt-1 font-semibold">
                      INR {consumptionReport.summary.totalCostInr.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unit Rate</p>
                    <p className="mt-1 font-semibold">INR {unitPrice.toFixed(2)}/kWh</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Total Energy</p>
                  <p className="mt-1 text-lg font-semibold">
                    {consumptionReport.summary.totalEnergyKwh.toFixed(2)} kWh
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="mt-1 text-lg font-semibold">
                    INR {consumptionReport.summary.totalCostInr.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Avg per Period</p>
                  <p className="mt-1 text-lg font-semibold">
                    {consumptionReport.summary.averageEnergyPerPeriod.toFixed(2)} kWh
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Periods</p>
                  <p className="mt-1 text-lg font-semibold">
                    {consumptionReport.summary.periodCount}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border/70">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Period</th>
                      <th className="px-3 py-2 font-semibold">Energy (kWh)</th>
                      <th className="px-3 py-2 font-semibold">Cost (INR)</th>
                      <th className="px-3 py-2 font-semibold">Percent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumptionReport.rows.map((row) => (
                      <tr key={row.periodKey} className="border-t border-border/70">
                        <td className="px-3 py-1.5 text-muted-foreground">{row.periodLabel}</td>
                        <td className="px-3 py-1.5">{row.energyKwh.toFixed(2)}</td>
                        <td className="px-3 py-1.5">{row.costInr.toFixed(2)}</td>
                        <td className="px-3 py-1.5">{row.percentage.toFixed(2)}%</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border/70 bg-muted/20 font-semibold">
                      <td className="px-3 py-1.5">Total</td>
                      <td className="px-3 py-1.5">
                        {consumptionReport.summary.totalEnergyKwh.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5">
                        {consumptionReport.summary.totalCostInr.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5">100.00%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </article>
    </div>
  )
}
