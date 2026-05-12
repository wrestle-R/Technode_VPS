"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { buildTrendRows } from "@/components/customer/ems/helpers"
import {
  buildAnalyticalReportModel,
  buildConsumptionReportModel,
  buildCsvExport,
  buildRawReportModel,
  consumptionRangeLabel,
  reportDateRangeLabel,
  selectReportRows,
} from "@/components/customer/ems/reports/report-export"
import { EmsDashboardGrid } from "@/components/customer/ems/charts/ems-dashboard-grid"
import { EmsLogsTable } from "@/components/customer/ems/logs/ems-logs-table"
import { EmsReportsPanel } from "@/components/customer/ems/reports/ems-reports-panel"
import { useCustomerEms } from "@/contexts/customer-ems-context"
import { useUser } from "@/contexts/user-context"
import type {
  ConsumptionRange,
  CustomerUnitDetail,
  EnergyAnalytics,
  HourlyCurrentStats,
  HourlyVoltageStats,
  ReportExportFormat,
  ReportRange,
  ReportType,
  UnitLog,
} from "@/components/customer/ems/types"

const LOGS_PAGE_SIZE = 50
const DASHBOARD_ENERGY_RANGE = "7d"

type LogsApiResponse = {
  logs: UnitLog[]
  nextCursor: string | null
  hasMore: boolean
}

type LogsPageCache = {
  rows: UnitLog[]
  nextCursor: string | null
  hasMore: boolean
}

function toDateParam(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function mapLogsForMeter(logs: UnitLog[], meterKey: string) {
  return logs
    .map((log) => {
      const meter = log.meters.find((entry) => entry.meterKey === meterKey)
      if (!meter) {
        return null
      }

      return {
        id: log.id,
        deviceTimestamp: log.deviceTimestamp,
        metrics: meter.metrics,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
}

function buildInitialLogsPage(logs: UnitLog[]): LogsPageCache {
  const rows = logs.slice(0, LOGS_PAGE_SIZE)
  const hasMore = logs.length > LOGS_PAGE_SIZE

  return {
    rows,
    nextCursor:
      hasMore && rows.length > 0 ? (rows[rows.length - 1]?.id ?? null) : null,
    hasMore,
  }
}

export function CustomerUnitTabClient({
  initialUnit,
  tab,
}: {
  initialUnit: CustomerUnitDetail
  tab: string
}) {
  const CACHE_TTL_MS = 10_000
  const searchParams = useSearchParams()
  const { user } = useUser()
  const { activeUnit, refreshCurrentUnit, setActiveUnit } = useCustomerEms()
  const unit =
    activeUnit && activeUnit.unitId === initialUnit.unitId
      ? activeUnit
      : initialUnit
  const [selectedMeterKey, setSelectedMeterKey] = useState(
    initialUnit.latestMeters[0]?.meterKey ?? ""
  )
  const [reportRange, setReportRange] = useState<ReportRange>("30d")
  const [reportType, setReportType] = useState<ReportType>("raw")
  const [consumptionRange, setConsumptionRange] =
    useState<ConsumptionRange>("monthly")
  const [unitPrice, setUnitPrice] = useState(8.5)
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(
    undefined
  )
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(
    undefined
  )
  const [hourlyCurrent, setHourlyCurrent] = useState<HourlyCurrentStats>({
    points: [],
    computedAt: new Date(0).toISOString(),
  })
  const [hourlyVoltage, setHourlyVoltage] = useState<HourlyVoltageStats>({
    points: [],
    computedAt: new Date(0).toISOString(),
  })
  const [energyAnalytics, setEnergyAnalytics] =
    useState<EnergyAnalytics | null>(null)
  const initialLogsPage = buildInitialLogsPage(initialUnit.logs)
  const [logsPageIndex, setLogsPageIndex] = useState(0)
  const [logsPageRows, setLogsPageRows] = useState<UnitLog[]>(
    initialLogsPage.rows
  )
  const [logsHasMore, setLogsHasMore] = useState(initialLogsPage.hasMore)
  const [isLogsPageLoading, setIsLogsPageLoading] = useState(false)
  const [reportRowsInRangeCount, setReportRowsInRangeCount] = useState<
    number | null
  >(null)
  const [isReportRowsInRangeCountLoading, setIsReportRowsInRangeCountLoading] =
    useState(false)
  const hourlyCurrentCacheRef = useRef(
    new Map<string, { data: HourlyCurrentStats; fetchedAt: number }>()
  )
  const hourlyVoltageCacheRef = useRef(
    new Map<string, { data: HourlyVoltageStats; fetchedAt: number }>()
  )
  const energyAnalyticsCacheRef = useRef(
    new Map<string, { data: EnergyAnalytics; fetchedAt: number }>()
  )
  const logsPageCacheRef = useRef(
    new Map<number, LogsPageCache>([[0, initialLogsPage]])
  )
  const logsPageRequestTokenRef = useRef(0)
  const lastAppliedMeterQueryRef = useRef<string | null>(null)

  useEffect(() => {
    setActiveUnit(initialUnit)
  }, [initialUnit, setActiveUnit])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const nextUnit = await refreshCurrentUnit(initialUnit.unitId)
      if (!cancelled && nextUnit) {
        setSelectedMeterKey(
          (current) => current || nextUnit.latestMeters[0]?.meterKey || ""
        )
      }
    }

    void load()

    const interval = window.setInterval(() => {
      void load()
    }, 30_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [initialUnit.unitId, refreshCurrentUnit])

  const availableMeters = useMemo(() => {
    const map = new Map<string, { meterKey: string; name: string }>()

    for (const meter of unit.latestMeters) {
      map.set(meter.meterKey, {
        meterKey: meter.meterKey,
        name: meter.name,
      })
    }

    for (const log of unit.logs) {
      for (const meter of log.meters) {
        if (!map.has(meter.meterKey)) {
          map.set(meter.meterKey, {
            meterKey: meter.meterKey,
            name: meter.name,
          })
        }
      }
    }

    return Array.from(map.values())
  }, [unit])

  useEffect(() => {
    const meterQuery = searchParams.get("meter")
    if (!meterQuery) {
      return
    }

    const normalizedQuery = meterQuery.trim().toLowerCase()
    if (
      !normalizedQuery ||
      lastAppliedMeterQueryRef.current === normalizedQuery
    ) {
      return
    }

    const match = availableMeters.find((meter) => {
      const keyMatches = meter.meterKey.trim().toLowerCase() === normalizedQuery
      const nameMatches = meter.name.trim().toLowerCase() === normalizedQuery
      return keyMatches || nameMatches
    })

    if (match) {
      setSelectedMeterKey(match.meterKey)
      lastAppliedMeterQueryRef.current = normalizedQuery
    }
  }, [availableMeters, searchParams])

  const effectiveMeterKey =
    selectedMeterKey || availableMeters[0]?.meterKey || ""

  const selectedLogRows = useMemo(
    () => mapLogsForMeter(unit.logs, effectiveMeterKey),
    [effectiveMeterKey, unit.logs]
  )

  const pagedSelectedLogRows = useMemo(
    () => mapLogsForMeter(logsPageRows, effectiveMeterKey),
    [effectiveMeterKey, logsPageRows]
  )
  const latestUnitLogId = unit.logs[0]?.id ?? null

  useEffect(() => {
    const firstPage = buildInitialLogsPage(unit.logs)
    const cachedFirstPage = logsPageCacheRef.current.get(0)
    const hasCachedRows = Boolean(
      cachedFirstPage && cachedFirstPage.rows.length > 0
    )
    const hasIncomingRows = Boolean(firstPage.rows.length > 0)
    if (hasCachedRows && !hasIncomingRows) {
      return
    }

    logsPageRequestTokenRef.current += 1
    logsPageCacheRef.current.clear()
    logsPageCacheRef.current.set(0, firstPage)
    setLogsPageIndex(0)
    setLogsPageRows(firstPage.rows)
    setLogsHasMore(firstPage.hasMore)
    setIsLogsPageLoading(false)
  }, [effectiveMeterKey, latestUnitLogId, unit.logs, unit.unitId])

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

  useEffect(() => {
    let cancelled = false

    async function loadHourlyCurrent() {
      if (tab !== "charts") {
        return
      }

      if (!effectiveMeterKey) {
        setHourlyCurrent({ points: [], computedAt: new Date().toISOString() })
        return
      }

      const cacheKey = `${unit.unitId}:${effectiveMeterKey}`
      const cached = hourlyCurrentCacheRef.current.get(cacheKey)
      if (cached) {
        setHourlyCurrent(cached.data)
      }

      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return
      }

      try {
        const response = await fetch(
          `/api/customer/ems/${encodeURIComponent(unit.unitId)}/current-hourly?meterKey=${encodeURIComponent(effectiveMeterKey)}`,
          {
            cache: "no-store",
          }
        )

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { hourly?: HourlyCurrentStats }
        if (!cancelled && data.hourly) {
          hourlyCurrentCacheRef.current.set(cacheKey, {
            data: data.hourly,
            fetchedAt: Date.now(),
          })
          setHourlyCurrent(data.hourly)
        }
      } catch {
        return
      }
    }

    void loadHourlyCurrent()

    const interval =
      tab === "charts"
        ? window.setInterval(() => {
            void loadHourlyCurrent()
          }, 30_000)
        : null

    return () => {
      cancelled = true
      if (interval) {
        window.clearInterval(interval)
      }
    }
  }, [effectiveMeterKey, tab, unit.unitId])

  useEffect(() => {
    let cancelled = false

    async function loadHourlyVoltage() {
      if (tab !== "charts") {
        return
      }

      if (!effectiveMeterKey) {
        setHourlyVoltage({ points: [], computedAt: new Date().toISOString() })
        return
      }

      const cacheKey = `${unit.unitId}:${effectiveMeterKey}`
      const cached = hourlyVoltageCacheRef.current.get(cacheKey)
      if (cached) {
        setHourlyVoltage(cached.data)
      }

      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return
      }

      try {
        const response = await fetch(
          `/api/customer/ems/${encodeURIComponent(unit.unitId)}/voltage-hourly?meterKey=${encodeURIComponent(effectiveMeterKey)}`,
          {
            cache: "no-store",
          }
        )

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { hourly?: HourlyVoltageStats }
        if (!cancelled && data.hourly) {
          hourlyVoltageCacheRef.current.set(cacheKey, {
            data: data.hourly,
            fetchedAt: Date.now(),
          })
          setHourlyVoltage(data.hourly)
        }
      } catch {
        return
      }
    }

    void loadHourlyVoltage()

    const interval =
      tab === "charts"
        ? window.setInterval(() => {
            void loadHourlyVoltage()
          }, 30_000)
        : null

    return () => {
      cancelled = true
      if (interval) {
        window.clearInterval(interval)
      }
    }
  }, [effectiveMeterKey, tab, unit.unitId])

  useEffect(() => {
    let cancelled = false

    async function loadEnergyAnalytics() {
      if (tab !== "charts") {
        return
      }

      if (!effectiveMeterKey) {
        setEnergyAnalytics(null)
        return
      }

      const cacheKey = `${unit.unitId}:${effectiveMeterKey}:${DASHBOARD_ENERGY_RANGE}`
      const cached = energyAnalyticsCacheRef.current.get(cacheKey)
      if (cached) {
        setEnergyAnalytics(cached.data)
      }

      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return
      }

      try {
        const response = await fetch(
          `/api/customer/ems/${encodeURIComponent(unit.unitId)}/energy-analytics?meterKey=${encodeURIComponent(effectiveMeterKey)}&dailyRange=${encodeURIComponent(DASHBOARD_ENERGY_RANGE)}`,
          {
            cache: "no-store",
          }
        )

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { analytics?: EnergyAnalytics }
        if (!cancelled && data.analytics) {
          energyAnalyticsCacheRef.current.set(cacheKey, {
            data: data.analytics,
            fetchedAt: Date.now(),
          })
          setEnergyAnalytics(data.analytics)
        }
      } catch {
        return
      }
    }

    void loadEnergyAnalytics()

    const interval =
      tab === "charts"
        ? window.setInterval(() => {
            void loadEnergyAnalytics()
          }, 30_000)
        : null

    return () => {
      cancelled = true
      if (interval) {
        window.clearInterval(interval)
      }
    }
  }, [effectiveMeterKey, tab, unit.unitId])

  const reportRows = useMemo(() => {
    return selectReportRows({
      trendRows,
      reportType,
      reportRange,
      customStartDate,
      customEndDate,
      consumptionRange,
    })
  }, [
    consumptionRange,
    customEndDate,
    customStartDate,
    reportRange,
    reportType,
    trendRows,
  ])

  useEffect(() => {
    let cancelled = false

    async function loadReportRowsInRangeCount() {
      if (tab !== "reports" || reportType === "consumption") {
        setIsReportRowsInRangeCountLoading(false)
        setReportRowsInRangeCount(null)
        return
      }

      if (!effectiveMeterKey) {
        setIsReportRowsInRangeCountLoading(false)
        setReportRowsInRangeCount(0)
        return
      }

      setIsReportRowsInRangeCountLoading(true)

      const params = new URLSearchParams()
      params.set("meterKey", effectiveMeterKey)
      params.set("reportRange", reportRange)

      if (reportRange === "custom") {
        if (customStartDate) {
          params.set("startDate", toDateParam(customStartDate))
        }
        if (customEndDate) {
          params.set("endDate", toDateParam(customEndDate))
        }
      }

      try {
        const response = await fetch(
          `/api/customer/ems/${encodeURIComponent(unit.unitId)}/reports/count?${params.toString()}`,
          {
            cache: "no-store",
          }
        )

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { rowCount?: number }
        if (!cancelled) {
          setReportRowsInRangeCount(
            typeof data.rowCount === "number" && Number.isFinite(data.rowCount)
              ? Math.max(0, Math.floor(data.rowCount))
              : 0
          )
        }
      } catch {
        return
      } finally {
        if (!cancelled) {
          setIsReportRowsInRangeCountLoading(false)
        }
      }
    }

    void loadReportRowsInRangeCount()

    return () => {
      cancelled = true
    }
  }, [
    customEndDate,
    customStartDate,
    effectiveMeterKey,
    reportRange,
    reportType,
    tab,
    unit.unitId,
  ])

  function goToPreviousLogsPage() {
    if (isLogsPageLoading || logsPageIndex === 0) {
      return
    }

    const previousIndex = logsPageIndex - 1
    const cached = logsPageCacheRef.current.get(previousIndex)
    if (!cached) {
      return
    }

    setLogsPageIndex(previousIndex)
    setLogsPageRows(cached.rows)
    setLogsHasMore(cached.hasMore)
  }

  async function goToNextLogsPage() {
    if (isLogsPageLoading || !logsHasMore) {
      return
    }

    const nextIndex = logsPageIndex + 1
    const cached = logsPageCacheRef.current.get(nextIndex)
    if (cached) {
      setLogsPageIndex(nextIndex)
      setLogsPageRows(cached.rows)
      setLogsHasMore(cached.hasMore)
      return
    }

    const currentPage = logsPageCacheRef.current.get(logsPageIndex)
    if (!currentPage || !currentPage.hasMore || !currentPage.nextCursor) {
      setLogsHasMore(false)
      return
    }

    const requestToken = logsPageRequestTokenRef.current + 1
    logsPageRequestTokenRef.current = requestToken
    setIsLogsPageLoading(true)

    const params = new URLSearchParams()
    params.set("cursor", currentPage.nextCursor)
    params.set("limit", String(LOGS_PAGE_SIZE))

    try {
      const response = await fetch(
        `/api/customer/ems/${encodeURIComponent(unit.unitId)}/logs?${params.toString()}`,
        {
          cache: "no-store",
        }
      )

      if (!response.ok) {
        toast.error("Unable to load more logs")
        return
      }

      const data = (await response.json()) as LogsApiResponse
      const nextPage: LogsPageCache = {
        rows: data.logs,
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
      }
      logsPageCacheRef.current.set(nextIndex, nextPage)

      if (logsPageRequestTokenRef.current !== requestToken) {
        return
      }

      setLogsPageIndex(nextIndex)
      setLogsPageRows(nextPage.rows)
      setLogsHasMore(nextPage.hasMore)
    } catch {
      toast.error("Unable to load more logs")
    } finally {
      if (logsPageRequestTokenRef.current === requestToken) {
        setIsLogsPageLoading(false)
      }
    }
  }

  function buildRawCsvExportUrl(dateRangeLabel: string) {
    const params = new URLSearchParams()
    params.set("meterKey", effectiveMeterKey)
    params.set("reportRange", reportRange)
    params.set("dateRangeLabel", dateRangeLabel)

    if (reportRange === "custom") {
      if (customStartDate) {
        params.set("startDate", toDateParam(customStartDate))
      }
      if (customEndDate) {
        params.set("endDate", toDateParam(customEndDate))
      }
    }

    return `/api/customer/ems/${encodeURIComponent(unit.unitId)}/reports/csv?${params.toString()}`
  }

  function triggerFileDownload({
    content,
    filename,
    mimeType,
  }: {
    content: string
    filename: string
    mimeType: string
  }) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function buildPdfExportUrl({
    reportType,
    reportRange,
    consumptionRange,
    unitPrice,
    dateRangeLabel,
  }: {
    reportType: ReportType
    reportRange: ReportRange
    consumptionRange: ConsumptionRange
    unitPrice: number
    dateRangeLabel: string
  }) {
    const params = new URLSearchParams()
    params.set("meterKey", effectiveMeterKey)
    params.set("reportType", reportType)
    params.set("reportRange", reportRange)
    params.set("consumptionRange", consumptionRange)
    params.set("unitPrice", String(unitPrice))
    params.set("dateRangeLabel", dateRangeLabel)

    if (reportRange === "custom") {
      if (customStartDate) {
        params.set("startDate", toDateParam(customStartDate))
      }
      if (customEndDate) {
        params.set("endDate", toDateParam(customEndDate))
      }
    }

    return `/api/customer/ems/${encodeURIComponent(unit.unitId)}/reports/pdf?${params.toString()}`
  }

  function exportReport(format: ReportExportFormat) {
    if (reportRows.length === 0) {
      toast.error("No data available for export")
      return
    }

    const generatedAt = new Date()
    const rawReport = buildRawReportModel(reportRows)
    const analyticalReport = buildAnalyticalReportModel(reportRows)
    const consumptionReport = buildConsumptionReportModel({
      rows: reportRows,
      mode: consumptionRange,
      unitPrice,
    })
    const effectiveDateRangeLabel =
      reportType === "consumption"
        ? consumptionRangeLabel(consumptionRange)
        : reportDateRangeLabel(reportRows)

    if (format === "csv" && reportType === "raw") {
      if (!effectiveMeterKey) {
        toast.error("Please select a meter before exporting")
        return
      }

      const anchor = document.createElement("a")
      anchor.href = buildRawCsvExportUrl(effectiveDateRangeLabel)
      anchor.rel = "noopener"
      anchor.click()
      toast.success("Raw CSV export started")
      return
    }

    if (format === "csv") {
      const csv = buildCsvExport({
        reportType,
        rawReport,
        analyticalReport,
        consumptionReport,
        unitId: unit.unitId,
        companyName: user?.companyName ?? "",
        dateRangeLabel: effectiveDateRangeLabel,
        unitPrice,
        consumptionRange,
        generatedAt,
      })
      triggerFileDownload({
        content: csv.content,
        filename: csv.filename,
        mimeType: "text/csv;charset=utf-8;",
      })
      toast.success("CSV report downloaded")
      return
    }

    if (!effectiveMeterKey) {
      toast.error("Please select a meter before exporting")
      return
    }

    const anchor = document.createElement("a")
    anchor.href = buildPdfExportUrl({
      reportType,
      reportRange,
      consumptionRange,
      unitPrice,
      dateRangeLabel: effectiveDateRangeLabel,
    })
    anchor.rel = "noopener"
    anchor.click()
    toast.success("PDF export started")
  }

  if (tab === "charts") {
    const selectedMeter = availableMeters.find(
      (meter) => meter.meterKey === effectiveMeterKey
    )

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h1 className="text-2xl font-semibold">{unit.unitId}</h1>
          <p className="text-sm text-muted-foreground">
            {selectedMeter?.name ?? (effectiveMeterKey || "Selected meter")}
          </p>
        </div>

        <EmsDashboardGrid
          unitId={unit.unitId}
          meterKey={effectiveMeterKey}
          trendRows={trendRows}
          hourlyVoltagePoints={hourlyVoltage.points}
          hourlyCurrentPoints={hourlyCurrent.points}
          energyAnalytics={energyAnalytics}
          meterName={
            selectedMeter?.name ?? (effectiveMeterKey || "Selected meter")
          }
        />
      </div>
    )
  }

  if (tab === "reports") {
    return (
      <EmsReportsPanel
        unitId={unit.unitId}
        effectiveMeterKey={effectiveMeterKey}
        availableMeters={availableMeters}
        onMeterChange={setSelectedMeterKey}
        reportRange={reportRange}
        reportType={reportType}
        onReportRangeChange={setReportRange}
        onReportTypeChange={setReportType}
        onExport={exportReport}
        reportRows={reportRows}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        companyName={user?.companyName ?? ""}
        companyLoginImageUrl={user?.companyLoginImageUrl ?? ""}
        consumptionRange={consumptionRange}
        onConsumptionRangeChange={setConsumptionRange}
        unitPrice={unitPrice}
        onUnitPriceChange={setUnitPrice}
        reportRowsInRangeCount={reportRowsInRangeCount}
        isReportRowsInRangeCountLoading={isReportRowsInRangeCountLoading}
      />
    )
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-r from-card to-muted/25 p-4 shadow-sm">
        <div className="flex min-w-0 flex-wrap items-start gap-3">
          <h1 className="max-w-full min-w-0 text-2xl font-semibold tracking-tight break-all">
            {unit.unitId}
          </h1>
        </div>
      </div>

      <EmsLogsTable
        effectiveMeterKey={effectiveMeterKey}
        availableMeters={availableMeters}
        onMeterChange={setSelectedMeterKey}
        metricColumns={metricColumns}
        selectedLogRows={pagedSelectedLogRows}
        pageIndex={logsPageIndex}
        pageSize={LOGS_PAGE_SIZE}
        hasMore={logsHasMore}
        isPageLoading={isLogsPageLoading}
        onPreviousPage={goToPreviousLogsPage}
        onNextPage={() => {
          void goToNextLogsPage()
        }}
      />
    </div>
  )
}
