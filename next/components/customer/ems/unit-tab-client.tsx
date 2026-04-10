"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  average,
  buildTrendRows,
  metricValueFromLatest,
  statusClasses,
} from "@/components/customer/ems/helpers"
import { EmsChartTabs } from "@/components/customer/ems/charts/ems-chart-tabs"
import { EmsOverviewTab } from "@/components/customer/ems/charts/ems-overview-tab"
import { EmsVoltageTab } from "@/components/customer/ems/charts/ems-voltage-tab"
import { EmsCurrentTab } from "@/components/customer/ems/charts/ems-current-tab"
import { EmsEnergyTab } from "@/components/customer/ems/charts/ems-energy-tab"
import { EmsDiagnosticTab } from "@/components/customer/ems/charts/ems-diagnostic-tab"
import { EmsLogsTable } from "@/components/customer/ems/logs/ems-logs-table"
import { EmsReportsPanel } from "@/components/customer/ems/reports/ems-reports-panel"
import { useUser } from "@/contexts/user-context"
import type {
  ChartTab,
  CustomerUnitDetail,
  ReportRange,
  ReportType,
  SummaryRange,
  SummaryStats,
} from "@/components/customer/ems/types"

export function CustomerUnitTabClient({
  initialUnit,
  tab,
}: {
  initialUnit: CustomerUnitDetail
  tab: string
}) {
  const { user } = useUser()
  const [unit, setUnit] = useState(initialUnit)
  const [selectedRtuKey, setSelectedRtuKey] = useState(
    initialUnit.latestRtus[0]?.rtuKey ?? ""
  )
  const [selectedChartTab, setSelectedChartTab] = useState<ChartTab>("overview")
  const [reportRange, setReportRange] = useState<ReportRange>("24h")
  const [reportType, setReportType] = useState<ReportType>("raw")
  const [summaryRange, setSummaryRange] = useState<SummaryRange>("7d")
  const [summary, setSummary] = useState<SummaryStats>({
    voltage: { max: null, min: null, avg: null },
    current: { max: null, min: null, avg: null },
    power: { max: null, min: null, avg: null },
    powerFactor: { max: null, min: null, avg: null },
  })
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(
    undefined
  )
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(
    undefined
  )
  const [hasRefreshError, setHasRefreshError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch(
          `/api/customer/ems/${encodeURIComponent(initialUnit.unitId)}`,
          {
            cache: "no-store",
          }
        )
        if (!response.ok) {
          if (!cancelled && !hasRefreshError) {
            setHasRefreshError(true)
            toast.error("Unable to refresh unit data")
          }
          return
        }

        const data = (await response.json()) as { unit?: CustomerUnitDetail }
        const nextUnit = data.unit
        if (!cancelled && nextUnit) {
          setUnit(nextUnit)
          setSelectedRtuKey(
            (current) => current || nextUnit.latestRtus[0]?.rtuKey || ""
          )
          if (hasRefreshError) {
            setHasRefreshError(false)
            toast.success("Unit data reconnected")
          }
        }
      } catch {
        if (!cancelled && !hasRefreshError) {
          setHasRefreshError(true)
          toast.error("Unable to refresh unit data")
        }
      }
    }

    const interval = window.setInterval(() => {
      void load()
    }, 20_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [hasRefreshError, initialUnit.unitId])

  const availableRtus = useMemo(() => {
    const map = new Map<string, { rtuKey: string; nickname: string }>()

    for (const rtu of unit.latestRtus) {
      map.set(rtu.rtuKey, {
        rtuKey: rtu.rtuKey,
        nickname: rtu.nickname,
      })
    }

    for (const log of unit.logs) {
      for (const rtu of log.rtus) {
        if (!map.has(rtu.rtuKey)) {
          map.set(rtu.rtuKey, {
            rtuKey: rtu.rtuKey,
            nickname: rtu.nickname,
          })
        }
      }
    }

    return Array.from(map.values())
  }, [unit])

  const effectiveRtuKey = selectedRtuKey || availableRtus[0]?.rtuKey || ""

  const selectedLogRows = useMemo(() => {
    return unit.logs
      .map((log) => {
        const rtu = log.rtus.find((entry) => entry.rtuKey === effectiveRtuKey)
        if (!rtu) {
          return null
        }

        return {
          id: log.id,
          deviceTimestamp: log.deviceTimestamp,
          metrics: rtu.metrics,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  }, [effectiveRtuKey, unit.logs])

  const metricColumns = useMemo(() => {
    const map = new Map<string, { key: string; label: string; order: number }>()

    for (const row of selectedLogRows) {
      for (const metric of row.metrics) {
        if (!map.has(metric.key)) {
          map.set(metric.key, {
            key: metric.key,
            label: metric.label,
            order: metric.order,
          })
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.order - b.order)
  }, [selectedLogRows])

  const trendRows = useMemo(
    () => buildTrendRows(selectedLogRows),
    [selectedLogRows]
  )

  const frequency = metricValueFromLatest(trendRows, "Freq")

  const overviewSnapshot = useMemo(() => {
    const vry = metricValueFromLatest(trendRows, "VRY")
    const vyb = metricValueFromLatest(trendRows, "VYB")
    const vbr = metricValueFromLatest(trendRows, "VBR")
    const vrn = metricValueFromLatest(trendRows, "VRN")
    const vyn = metricValueFromLatest(trendRows, "VYN")
    const vbn = metricValueFromLatest(trendRows, "VBN")
    const ir = metricValueFromLatest(trendRows, "IR")
    const iy = metricValueFromLatest(trendRows, "IY")
    const ib = metricValueFromLatest(trendRows, "IB")
    const pfr = metricValueFromLatest(trendRows, "PF-R")
    const pfy = metricValueFromLatest(trendRows, "PF-Y")
    const pfb = metricValueFromLatest(trendRows, "PF-B")

    return {
      voltageLL: average([vry, vyb, vbr]),
      voltageR: vrn,
      voltageY: vyn,
      voltageB: vbn,
      currentTotal: average([ir, iy, ib]),
      currentR: ir,
      currentY: iy,
      currentB: ib,
      powerFactorAvg: average([pfr, pfy, pfb]),
      powerFactorR: pfr,
      powerFactorY: pfy,
      powerFactorB: pfb,
      frequency,
    }
  }, [frequency, trendRows])

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      if (!effectiveRtuKey) {
        return
      }

      try {
        const response = await fetch(
          `/api/customer/ems/${encodeURIComponent(unit.unitId)}/summary?range=${summaryRange}&rtuKey=${encodeURIComponent(effectiveRtuKey)}`,
          {
            cache: "no-store",
          }
        )

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { summary?: SummaryStats }
        if (!cancelled && data.summary) {
          setSummary(data.summary)
        }
      } catch {
        return
      }
    }

    void loadSummary()

    return () => {
      cancelled = true
    }
  }, [effectiveRtuKey, summaryRange, unit.unitId])

  const kwhDelta = useMemo(() => {
    const values = trendRows
      .map((row) => row.Kwh)
      .filter((value): value is number => typeof value === "number")
    if (values.length < 2) {
      return null
    }
    return Math.max(values[values.length - 1] - values[0], 0)
  }, [trendRows])

  const reportRows = useMemo(() => {
    if (reportRange === "custom") {
      if (!customStartDate || !customEndDate) {
        return trendRows
      }
      const start = new Date(customStartDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(customEndDate)
      end.setHours(23, 59, 59, 999)

      return trendRows.filter((row) => {
        const at = new Date(row.timestamp).getTime()
        return at >= start.getTime() && at <= end.getTime()
      })
    }

    if (reportRange === "24h") {
      return trendRows.slice(-24)
    }
    if (reportRange === "7d") {
      return trendRows.slice(-7 * 24)
    }
    return trendRows.slice(-30 * 24)
  }, [customEndDate, customStartDate, reportRange, trendRows])

  function exportCsv() {
    if (reportRows.length === 0) {
      toast.error("No data available for CSV export")
      return
    }

    const columns = [
      "timestamp",
      "VRY",
      "VYB",
      "VBR",
      "VRN",
      "VYN",
      "VBN",
      "IR",
      "IY",
      "IB",
      "KW-R",
      "KW-Y",
      "KW-B",
      "PF-R",
      "PF-Y",
      "PF-B",
      "Freq",
      "Kwh",
      "KvAh",
      "KvArh",
    ]
    const lines = [columns.join(",")]

    for (const row of reportRows) {
      lines.push(
        columns
          .map((column) => {
            const value = (row as Record<string, unknown>)[column]
            if (typeof value === "number") {
              return value.toString()
            }
            return `"${String(value ?? "").replaceAll('"', '""')}"`
          })
          .join(",")
      )
    }

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${unit.unitId}-${effectiveRtuKey}-${reportType}-${reportRange}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function exportPdf() {
    if (reportRows.length === 0) {
      toast.error("No data available for PDF export")
      return
    }
    window.print()
  }

  if (tab === "charts") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                EMS Analytics
              </p>
              <h1 className="text-2xl font-semibold">{unit.unitId}</h1>
              <p className="text-sm text-muted-foreground">
                Live meter analytics with real-time trend panels.
              </p>
            </div>
            <label className="grid gap-2 text-sm sm:min-w-56">
              <span className="font-medium">Meter</span>
              <select
                className="h-10 rounded-xl border border-input bg-white/90 px-3"
                value={effectiveRtuKey}
                onChange={(event) => setSelectedRtuKey(event.target.value)}
              >
                {availableRtus.map((rtu) => (
                  <option key={rtu.rtuKey} value={rtu.rtuKey}>
                    {rtu.nickname}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <EmsChartTabs
            selectedChartTab={selectedChartTab}
            onChange={setSelectedChartTab}
          />
        </div>

        {selectedChartTab === "voltage" ? (
          <EmsVoltageTab trendRows={trendRows} />
        ) : null}
        {selectedChartTab === "overview" ? (
          <EmsOverviewTab
            trendRows={trendRows}
            snapshot={overviewSnapshot}
            summary={summary}
            summaryRange={summaryRange}
            onSummaryRangeChange={setSummaryRange}
          />
        ) : null}
        {selectedChartTab === "current" ? (
          <EmsCurrentTab trendRows={trendRows} />
        ) : null}
        {selectedChartTab === "energy" ? (
          <EmsEnergyTab trendRows={trendRows} kwhDelta={kwhDelta} />
        ) : null}
        {selectedChartTab === "diagnostic" ? (
          <EmsDiagnosticTab trendRows={trendRows} />
        ) : null}
      </div>
    )
  }

  if (tab === "reports") {
    return (
      <EmsReportsPanel
        unitId={unit.unitId}
        effectiveRtuKey={effectiveRtuKey}
        availableRtus={availableRtus}
        onRtuChange={setSelectedRtuKey}
        reportRange={reportRange}
        reportType={reportType}
        onReportRangeChange={setReportRange}
        onReportTypeChange={setReportType}
        onExportCsv={exportCsv}
        onExportPdf={exportPdf}
        reportRows={reportRows}
        kwhDelta={kwhDelta}
        frequency={frequency}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        companyName={user?.companyName ?? ""}
        companyLoginImageUrl={user?.companyLoginImageUrl ?? ""}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{unit.unitId}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(unit.status)}`}
            >
              {unit.status}
            </span>
            <p className="text-sm text-muted-foreground">
              Last seen:{" "}
              {unit.lastSeenAt
                ? new Date(unit.lastSeenAt).toLocaleString()
                : "Never"}
            </p>
          </div>
        </div>
      </div>

      <EmsLogsTable
        effectiveRtuKey={effectiveRtuKey}
        availableRtus={availableRtus}
        onRtuChange={setSelectedRtuKey}
        metricColumns={metricColumns}
        selectedLogRows={selectedLogRows}
      />
    </div>
  )
}
