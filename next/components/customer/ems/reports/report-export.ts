import { format } from "date-fns"

import type {
  ConsumptionRange,
  ReportRange,
  ReportType,
  TrendPoint,
} from "@/components/customer/ems/types"

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

type RawMetricRow = {
  timestamp: string
  kwh: number | null
  kvah: number | null
  kvarh: number | null
  voltageRn: number | null
  voltageYn: number | null
  voltageBn: number | null
  voltageRy: number | null
  voltageYb: number | null
  voltageBr: number | null
  currentR: number | null
  currentY: number | null
  currentB: number | null
  kwR: number | null
  kwY: number | null
  kwB: number | null
  pfR: number | null
  pfY: number | null
  pfB: number | null
  frequency: number | null
}

export type RawReportModel = {
  rows: RawMetricRow[]
  previewRows: RawMetricRow[]
  avgEnergy: number | null
  maxEnergy: number | null
  avgVoltage: number | null
  avgCurrent: number | null
}

export type AnalyticalGranularity = "hourly" | "daily"

export type AnalyticalPeriodRow = {
  periodKey: string
  periodLabel: string
  energyKwh: number
  maxLoadKw: number
  avgPf: number
  peakCurrentA: number
  maxVoltageV: number
}

export type AnalyticalSummary = {
  periodCount: number
  totalEnergyKwh: number
  averageMaxLoadKw: number
  averagePf: number
  peakCurrentOverallA: number
  maxVoltageOverallV: number
}

export type AnalyticalReportModel = {
  granularity: AnalyticalGranularity
  rows: AnalyticalPeriodRow[]
  summary: AnalyticalSummary
}

export type ConsumptionPeriodRow = {
  periodKey: string
  periodLabel: string
  energyKwh: number
  costInr: number
  percentage: number
}

export type ConsumptionSummary = {
  timePeriodLabel: string
  periodCount: number
  totalEnergyKwh: number
  totalCostInr: number
  averageEnergyPerPeriod: number
  averageCostPerPeriod: number
}

export type ConsumptionReportModel = {
  rows: ConsumptionPeriodRow[]
  summary: ConsumptionSummary
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function numberFromRow(row: TrendPoint, key: string) {
  return asNumber(row[key])
}

function parseTimestamp(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function orderedRows(rows: TrendPoint[]) {
  return rows
    .slice()
    .sort((left, right) => {
      const leftMs = parseTimestamp(left.timestamp)?.getTime() ?? 0
      const rightMs = parseTimestamp(right.timestamp)?.getTime() ?? 0
      return leftMs - rightMs
    })
}

function average(values: number[]) {
  if (values.length === 0) {
    return null
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function maximum(values: number[]) {
  if (values.length === 0) {
    return null
  }
  return Math.max(...values)
}

function fixed(value: number | null, digits: number) {
  return value == null ? "" : value.toFixed(digits)
}

function fixedOrZero(value: number | null, digits: number) {
  return (value ?? 0).toFixed(digits)
}

function csvEscape(value: string) {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

function csvLine(values: string[]) {
  return values.map(csvEscape).join(",")
}

function formatTimestampLabel(value: string) {
  const parsed = parseTimestamp(value)
  if (!parsed) {
    return value
  }
  return format(parsed, "yyyy-MM-dd HH:mm:ss")
}

function sanitizeFileSegment(value: string) {
  const sanitized = value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return sanitized || "device"
}

function rowsFromRecentWindow(rows: TrendPoint[], windowMs: number) {
  if (rows.length === 0) {
    return []
  }

  const sorted = orderedRows(rows)
  const latest = parseTimestamp(sorted[sorted.length - 1]?.timestamp ?? "")
  if (!latest) {
    return sorted
  }
  const startMs = latest.getTime() - windowMs

  return sorted.filter((row) => {
    const at = parseTimestamp(row.timestamp)
    return at ? at.getTime() >= startMs && at.getTime() <= latest.getTime() : false
  })
}

function rowsFromCustomRange(
  rows: TrendPoint[],
  customStartDate: Date | undefined,
  customEndDate: Date | undefined
) {
  if (!customStartDate || !customEndDate) {
    return orderedRows(rows)
  }

  const start = new Date(customStartDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(customEndDate)
  end.setHours(23, 59, 59, 999)

  return orderedRows(rows).filter((row) => {
    const at = parseTimestamp(row.timestamp)
    if (!at) {
      return false
    }
    const ms = at.getTime()
    return ms >= start.getTime() && ms <= end.getTime()
  })
}

export function selectReportRows({
  trendRows,
  reportType,
  reportRange,
  customStartDate,
  customEndDate,
  consumptionRange,
}: {
  trendRows: TrendPoint[]
  reportType: ReportType
  reportRange: ReportRange
  customStartDate: Date | undefined
  customEndDate: Date | undefined
  consumptionRange: ConsumptionRange
}) {
  if (reportType === "consumption") {
    if (consumptionRange === "daily") {
      return rowsFromRecentWindow(trendRows, DAY_MS)
    }
    if (consumptionRange === "weekly") {
      return rowsFromRecentWindow(trendRows, 7 * DAY_MS)
    }
    return rowsFromRecentWindow(trendRows, 30 * DAY_MS)
  }

  if (reportRange === "24h") {
    return rowsFromRecentWindow(trendRows, DAY_MS)
  }
  if (reportRange === "7d") {
    return rowsFromRecentWindow(trendRows, 7 * DAY_MS)
  }
  if (reportRange === "30d") {
    return rowsFromRecentWindow(trendRows, 30 * DAY_MS)
  }
  return rowsFromCustomRange(trendRows, customStartDate, customEndDate)
}

export function reportDateRangeLabel(rows: TrendPoint[]) {
  if (rows.length === 0) {
    return "No data"
  }

  const sorted = orderedRows(rows)
  const first = parseTimestamp(sorted[0]?.timestamp ?? "")
  const last = parseTimestamp(sorted[sorted.length - 1]?.timestamp ?? "")
  if (!first || !last) {
    return "No data"
  }

  return `${format(first, "dd MMM yyyy HH:mm")} - ${format(last, "dd MMM yyyy HH:mm")}`
}

export function reportTypeTitle(reportType: ReportType) {
  if (reportType === "raw") {
    return "Raw Data Report"
  }
  if (reportType === "analytical") {
    return "Analytical Report"
  }
  return "Consumption & Cost"
}

export function consumptionRangeLabel(consumptionRange: ConsumptionRange) {
  if (consumptionRange === "daily") {
    return "Daily (Last 24 Hours)"
  }
  if (consumptionRange === "weekly") {
    return "Weekly (Last 7 Days)"
  }
  return "Monthly (Last 30 Days)"
}

export function buildRawReportModel(rows: TrendPoint[]): RawReportModel {
  const mapped = orderedRows(rows).map((row) => ({
    timestamp: row.timestamp,
    kwh: numberFromRow(row, "Kwh"),
    kvah: numberFromRow(row, "KvAh"),
    kvarh: numberFromRow(row, "KvArh"),
    voltageRn: numberFromRow(row, "VRN"),
    voltageYn: numberFromRow(row, "VYN"),
    voltageBn: numberFromRow(row, "VBN"),
    voltageRy: numberFromRow(row, "VRY"),
    voltageYb: numberFromRow(row, "VYB"),
    voltageBr: numberFromRow(row, "VBR"),
    currentR: numberFromRow(row, "IR"),
    currentY: numberFromRow(row, "IY"),
    currentB: numberFromRow(row, "IB"),
    kwR: numberFromRow(row, "KW-R"),
    kwY: numberFromRow(row, "KW-Y"),
    kwB: numberFromRow(row, "KW-B"),
    pfR: numberFromRow(row, "PF-R"),
    pfY: numberFromRow(row, "PF-Y"),
    pfB: numberFromRow(row, "PF-B"),
    frequency: numberFromRow(row, "Freq"),
  }))

  const energyValues = mapped
    .map((row) => row.kwh)
    .filter((value): value is number => value != null)
  const voltageSamples = mapped
    .map((row) => {
      const values = [
        row.voltageRn,
        row.voltageYn,
        row.voltageBn,
        row.voltageRy,
        row.voltageYb,
        row.voltageBr,
      ].filter((value): value is number => value != null)
      return average(values)
    })
    .filter((value): value is number => value != null)
  const currentSamples = mapped
    .map((row) => {
      const values = [row.currentR, row.currentY, row.currentB].filter(
        (value): value is number => value != null
      )
      return average(values)
    })
    .filter((value): value is number => value != null)

  return {
    rows: mapped,
    previewRows: mapped.slice(-50),
    avgEnergy: average(energyValues),
    maxEnergy: maximum(energyValues),
    avgVoltage: average(voltageSamples),
    avgCurrent: average(currentSamples),
  }
}

export function buildAnalyticalReportModel(rows: TrendPoint[]): AnalyticalReportModel {
  const sorted = orderedRows(rows)
  const first = parseTimestamp(sorted[0]?.timestamp ?? "")
  const last = parseTimestamp(sorted[sorted.length - 1]?.timestamp ?? "")
  const spanMs =
    first && last ? Math.max(last.getTime() - first.getTime(), 0) : Number.POSITIVE_INFINITY
  const granularity: AnalyticalGranularity = spanMs <= DAY_MS ? "hourly" : "daily"

  const buckets = new Map<
    string,
    {
      label: string
      minKwh: number | null
      maxKwh: number | null
      maxLoadKw: number
      pfSum: number
      pfCount: number
      peakCurrentA: number
      maxVoltageV: number
    }
  >()

  for (const row of sorted) {
    const at = parseTimestamp(row.timestamp)
    if (!at) {
      continue
    }

    const key =
      granularity === "hourly"
        ? format(at, "yyyy-MM-dd HH:00")
        : format(at, "yyyy-MM-dd")
    const label =
      granularity === "hourly"
        ? format(at, "dd MMM HH:00")
        : format(at, "dd MMM yyyy")

    const bucket =
      buckets.get(key) ??
      (() => {
        const created = {
          label,
          minKwh: null as number | null,
          maxKwh: null as number | null,
          maxLoadKw: 0,
          pfSum: 0,
          pfCount: 0,
          peakCurrentA: 0,
          maxVoltageV: 0,
        }
        buckets.set(key, created)
        return created
      })()

    const kwh = numberFromRow(row, "Kwh")
    if (kwh != null) {
      bucket.minKwh = bucket.minKwh == null ? kwh : Math.min(bucket.minKwh, kwh)
      bucket.maxKwh = bucket.maxKwh == null ? kwh : Math.max(bucket.maxKwh, kwh)
    }

    const kwValues = [
      numberFromRow(row, "KW-R"),
      numberFromRow(row, "KW-Y"),
      numberFromRow(row, "KW-B"),
    ].filter((value): value is number => value != null)
    if (kwValues.length > 0) {
      const totalKw = kwValues.reduce((sum, value) => sum + value, 0)
      bucket.maxLoadKw = Math.max(bucket.maxLoadKw, totalKw)
    }

    const pfValues = [
      numberFromRow(row, "PF-R"),
      numberFromRow(row, "PF-Y"),
      numberFromRow(row, "PF-B"),
    ].filter((value): value is number => value != null)
    if (pfValues.length > 0) {
      const pfRow = Math.min(
        pfValues.reduce((sum, value) => sum + value, 0) / pfValues.length,
        1
      )
      bucket.pfSum += pfRow
      bucket.pfCount += 1
    }

    const currentValues = [
      numberFromRow(row, "IR"),
      numberFromRow(row, "IY"),
      numberFromRow(row, "IB"),
    ].filter((value): value is number => value != null)
    if (currentValues.length > 0) {
      bucket.peakCurrentA = Math.max(bucket.peakCurrentA, Math.max(...currentValues))
    }

    const voltageValues = [
      numberFromRow(row, "VRN"),
      numberFromRow(row, "VYN"),
      numberFromRow(row, "VBN"),
      numberFromRow(row, "VRY"),
      numberFromRow(row, "VYB"),
      numberFromRow(row, "VBR"),
    ].filter((value): value is number => value != null)
    if (voltageValues.length > 0) {
      bucket.maxVoltageV = Math.max(bucket.maxVoltageV, Math.max(...voltageValues))
    }
  }

  const analyticalRows = Array.from(buckets.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([periodKey, bucket]) => {
      const energyKwh =
        bucket.minKwh != null && bucket.maxKwh != null
          ? Math.max(bucket.maxKwh - bucket.minKwh, 0)
          : 0

      return {
        periodKey,
        periodLabel: bucket.label,
        energyKwh,
        maxLoadKw: bucket.maxLoadKw,
        avgPf: bucket.pfCount > 0 ? bucket.pfSum / bucket.pfCount : 0,
        peakCurrentA: bucket.peakCurrentA,
        maxVoltageV: bucket.maxVoltageV,
      }
    })

  const summary: AnalyticalSummary = {
    periodCount: analyticalRows.length,
    totalEnergyKwh: analyticalRows.reduce((sum, row) => sum + row.energyKwh, 0),
    averageMaxLoadKw:
      analyticalRows.length > 0
        ? analyticalRows.reduce((sum, row) => sum + row.maxLoadKw, 0) / analyticalRows.length
        : 0,
    averagePf:
      analyticalRows.length > 0
        ? analyticalRows.reduce((sum, row) => sum + row.avgPf, 0) / analyticalRows.length
        : 0,
    peakCurrentOverallA:
      analyticalRows.length > 0
        ? Math.max(...analyticalRows.map((row) => row.peakCurrentA))
        : 0,
    maxVoltageOverallV:
      analyticalRows.length > 0
        ? Math.max(...analyticalRows.map((row) => row.maxVoltageV))
        : 0,
  }

  return {
    granularity,
    rows: analyticalRows,
    summary,
  }
}

type ConsumptionSlot = {
  key: string
  label: string
  start: Date
  end: Date
  minKwh: number | null
  maxKwh: number | null
}

function createConsumptionSlots(mode: ConsumptionRange, anchor: Date) {
  if (mode === "daily") {
    const anchorHour = new Date(anchor)
    anchorHour.setMinutes(0, 0, 0)
    const first = new Date(anchorHour)
    first.setHours(anchorHour.getHours() - 23)

    const slots: ConsumptionSlot[] = []
    for (let index = 0; index < 24; index += 1) {
      const start = new Date(first)
      start.setHours(first.getHours() + index)
      const end = new Date(start)
      end.setHours(start.getHours() + 1)
      slots.push({
        key: format(start, "yyyy-MM-dd HH:00"),
        label: format(start, "HH:mm"),
        start,
        end,
        minKwh: null,
        maxKwh: null,
      })
    }
    return slots
  }

  const anchorDay = new Date(anchor)
  anchorDay.setHours(0, 0, 0, 0)
  const days = mode === "weekly" ? 7 : 30
  const first = new Date(anchorDay)
  first.setDate(anchorDay.getDate() - (days - 1))

  const slots: ConsumptionSlot[] = []
  for (let index = 0; index < days; index += 1) {
    const start = new Date(first)
    start.setDate(first.getDate() + index)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)

    slots.push({
      key: format(start, "yyyy-MM-dd"),
      label: format(start, "dd MMM"),
      start,
      end,
      minKwh: null,
      maxKwh: null,
    })
  }
  return slots
}

export function buildConsumptionReportModel({
  rows,
  mode,
  unitPrice,
}: {
  rows: TrendPoint[]
  mode: ConsumptionRange
  unitPrice: number
}): ConsumptionReportModel {
  const sorted = orderedRows(rows)
  const anchor = parseTimestamp(sorted[sorted.length - 1]?.timestamp ?? "") ?? new Date()
  const slots = createConsumptionSlots(mode, anchor)
  const slotByKey = new Map(slots.map((slot) => [slot.key, slot]))
  const rangeStart = slots[0]?.start ?? new Date(anchor)
  const rangeEnd = slots[slots.length - 1]?.end ?? new Date(anchor)

  for (const row of sorted) {
    const at = parseTimestamp(row.timestamp)
    if (!at) {
      continue
    }

    const time = at.getTime()
    if (time < rangeStart.getTime() || time >= rangeEnd.getTime()) {
      continue
    }

    const key =
      mode === "daily" ? format(at, "yyyy-MM-dd HH:00") : format(at, "yyyy-MM-dd")
    const slot = slotByKey.get(key)
    if (!slot) {
      continue
    }

    const kwh = numberFromRow(row, "Kwh")
    if (kwh == null) {
      continue
    }

    slot.minKwh = slot.minKwh == null ? kwh : Math.min(slot.minKwh, kwh)
    slot.maxKwh = slot.maxKwh == null ? kwh : Math.max(slot.maxKwh, kwh)
  }

  const resolvedPrice = Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0
  const rowsWithCost = slots.map((slot) => {
    const energyKwh =
      slot.minKwh != null && slot.maxKwh != null
        ? Math.max(slot.maxKwh - slot.minKwh, 0)
        : 0
    const costInr = energyKwh * resolvedPrice

    return {
      periodKey: slot.key,
      periodLabel: slot.label,
      energyKwh,
      costInr,
      percentage: 0,
    }
  })

  const totalEnergyKwh = rowsWithCost.reduce((sum, row) => sum + row.energyKwh, 0)
  const totalCostInr = rowsWithCost.reduce((sum, row) => sum + row.costInr, 0)

  const rowsWithPercentage = rowsWithCost.map((row) => ({
    ...row,
    percentage: totalEnergyKwh > 0 ? (row.energyKwh / totalEnergyKwh) * 100 : 0,
  }))

  return {
    rows: rowsWithPercentage,
    summary: {
      timePeriodLabel: consumptionRangeLabel(mode),
      periodCount: rowsWithPercentage.length,
      totalEnergyKwh,
      totalCostInr,
      averageEnergyPerPeriod:
        rowsWithPercentage.length > 0 ? totalEnergyKwh / rowsWithPercentage.length : 0,
      averageCostPerPeriod:
        rowsWithPercentage.length > 0 ? totalCostInr / rowsWithPercentage.length : 0,
    },
  }
}

type CsvPayload = {
  reportType: ReportType
  rawReport: RawReportModel
  analyticalReport: AnalyticalReportModel
  consumptionReport: ConsumptionReportModel
  unitId: string
  companyName: string
  dateRangeLabel: string
  unitPrice: number
  consumptionRange: ConsumptionRange
  generatedAt: Date
}

function filePrefix(reportType: ReportType) {
  if (reportType === "raw") {
    return "EMS_Raw_Data"
  }
  if (reportType === "analytical") {
    return "EMS_Analytical"
  }
  return "EMS_Consumption"
}

export function reportFileName({
  reportType,
  unitId,
  extension,
  generatedAt,
}: {
  reportType: ReportType
  unitId: string
  extension: "csv" | "pdf"
  generatedAt: Date
}) {
  const day = format(generatedAt, "yyyy-MM-dd")
  return `${filePrefix(reportType)}_${sanitizeFileSegment(unitId)}_${day}.${extension}`
}

export function buildCsvExport(payload: CsvPayload) {
  const generatedAtText = format(payload.generatedAt, "yyyy-MM-dd HH:mm:ss")
  const filename = reportFileName({
    reportType: payload.reportType,
    unitId: payload.unitId,
    extension: "csv",
    generatedAt: payload.generatedAt,
  })

  if (payload.reportType === "raw") {
    const lines: string[] = [
      csvLine(["EMS Raw Data Report"]),
      csvLine([`Device: ${payload.unitId}`]),
      csvLine([`Customer: ${payload.companyName || "Technode"}`]),
      csvLine([`Date Range: ${payload.dateRangeLabel}`]),
      csvLine([`Total Records Exported: ${String(payload.rawReport.rows.length)}`]),
      csvLine([`Generated: ${generatedAtText}`]),
      "",
      csvLine([
        "Timestamp",
        "kWh",
        "kVAh",
        "kVArh",
        "Voltage_RN",
        "Voltage_YN",
        "Voltage_BN",
        "Voltage_RY",
        "Voltage_YB",
        "Voltage_BR",
        "Current_R",
        "Current_Y",
        "Current_B",
        "kW_R",
        "kW_Y",
        "kW_B",
        "PF_R",
        "PF_Y",
        "PF_B",
        "Frequency",
      ]),
    ]

    for (const row of payload.rawReport.rows) {
      lines.push(
        csvLine([
          formatTimestampLabel(row.timestamp),
          fixed(row.kwh, 2),
          fixed(row.kvah, 2),
          fixed(row.kvarh, 2),
          fixed(row.voltageRn, 1),
          fixed(row.voltageYn, 1),
          fixed(row.voltageBn, 1),
          fixed(row.voltageRy, 1),
          fixed(row.voltageYb, 1),
          fixed(row.voltageBr, 1),
          fixed(row.currentR, 2),
          fixed(row.currentY, 2),
          fixed(row.currentB, 2),
          fixed(row.kwR, 2),
          fixed(row.kwY, 2),
          fixed(row.kwB, 2),
          fixed(row.pfR, 3),
          fixed(row.pfY, 3),
          fixed(row.pfB, 3),
          fixed(row.frequency, 2),
        ])
      )
    }

    return {
      filename,
      content: lines.join("\n"),
    }
  }

  if (payload.reportType === "analytical") {
    const lines: string[] = [
      csvLine(["EMS Analytical Report"]),
      csvLine([`Device: ${payload.unitId}`]),
      csvLine([`Customer: ${payload.companyName || "Technode"}`]),
      csvLine([`Analysis Period Count: ${String(payload.analyticalReport.summary.periodCount)}`]),
      csvLine([`Time Granularity: ${payload.analyticalReport.granularity}`]),
      csvLine([`Selected Date Range: ${payload.dateRangeLabel}`]),
      csvLine([`Generated: ${generatedAtText}`]),
      "",
      csvLine([
        "Period",
        "Energy_kWh",
        "Max_Load_kW",
        "Avg_PowerFactor",
        "Peak_Current_A",
        "Max_Voltage_V",
      ]),
    ]

    for (const row of payload.analyticalReport.rows) {
      lines.push(
        csvLine([
          row.periodLabel,
          fixedOrZero(row.energyKwh, 2),
          fixedOrZero(row.maxLoadKw, 2),
          fixedOrZero(row.avgPf, 3),
          fixedOrZero(row.peakCurrentA, 2),
          fixedOrZero(row.maxVoltageV, 1),
        ])
      )
    }

    lines.push(
      "",
      csvLine(["Summary"]),
      csvLine([`Total Periods: ${String(payload.analyticalReport.summary.periodCount)}`]),
      csvLine([
        `Total Energy (kWh): ${fixedOrZero(payload.analyticalReport.summary.totalEnergyKwh, 2)}`,
      ]),
      csvLine([
        `Average Max Load (kW): ${fixedOrZero(payload.analyticalReport.summary.averageMaxLoadKw, 2)}`,
      ]),
      csvLine([
        `Average PF: ${fixedOrZero(payload.analyticalReport.summary.averagePf, 3)}`,
      ]),
      csvLine([
        `Peak Current Overall (A): ${fixedOrZero(payload.analyticalReport.summary.peakCurrentOverallA, 2)}`,
      ]),
      csvLine([
        `Max Voltage Overall (V): ${fixedOrZero(payload.analyticalReport.summary.maxVoltageOverallV, 1)}`,
      ])
    )

    return {
      filename,
      content: lines.join("\n"),
    }
  }

  const periodHeader =
    payload.consumptionRange === "daily"
      ? "Hour"
      : payload.consumptionRange === "weekly"
        ? "Day"
        : "Date"

  const lines: string[] = [
    csvLine(["EMS Consumption & Cost Report"]),
    csvLine([`Device: ${payload.unitId}`]),
    csvLine([`Customer: ${payload.companyName || "Technode"}`]),
    csvLine([`Time Period: ${payload.consumptionReport.summary.timePeriodLabel}`]),
    csvLine([`Unit Price: INR ${fixedOrZero(payload.unitPrice, 2)}`]),
    csvLine([
      `Total Energy Consumed: ${fixedOrZero(payload.consumptionReport.summary.totalEnergyKwh, 2)} kWh`,
    ]),
    csvLine([
      `Total Amount Spent: INR ${fixedOrZero(payload.consumptionReport.summary.totalCostInr, 2)}`,
    ]),
    csvLine([`Generated: ${generatedAtText}`]),
    "",
    csvLine([periodHeader, "Energy_kWh", "Cost_INR", "Percentage"]),
  ]

  for (const row of payload.consumptionReport.rows) {
    lines.push(
      csvLine([
        row.periodLabel,
        fixedOrZero(row.energyKwh, 2),
        fixedOrZero(row.costInr, 2),
        `${fixedOrZero(row.percentage, 2)}%`,
      ])
    )
  }

  lines.push(
    "",
    csvLine(["Summary"]),
    csvLine([
      `Total Energy: ${fixedOrZero(payload.consumptionReport.summary.totalEnergyKwh, 2)} kWh`,
    ]),
    csvLine([
      `Total Cost: INR ${fixedOrZero(payload.consumptionReport.summary.totalCostInr, 2)}`,
    ]),
    csvLine([`Unit Price: INR ${fixedOrZero(payload.unitPrice, 2)}`]),
    csvLine([`Number of Periods: ${String(payload.consumptionReport.summary.periodCount)}`]),
    csvLine([
      `Average Energy per Period: ${fixedOrZero(payload.consumptionReport.summary.averageEnergyPerPeriod, 2)} kWh`,
    ]),
    csvLine([
      `Average Cost per Period: INR ${fixedOrZero(payload.consumptionReport.summary.averageCostPerPeriod, 2)}`,
    ])
  )

  return {
    filename,
    content: lines.join("\n"),
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function htmlCell(value: string) {
  return `<td>${escapeHtml(value)}</td>`
}

function htmlRow(values: string[]) {
  return `<tr>${values.map(htmlCell).join("")}</tr>`
}

function htmlSummaryRow(label: string, value: string) {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
}

type PrintPayload = {
  reportType: ReportType
  rawReport: RawReportModel
  analyticalReport: AnalyticalReportModel
  consumptionReport: ConsumptionReportModel
  unitId: string
  companyName: string
  companyLogoUrl: string
  dateRangeLabel: string
  unitPrice: number
  generatedAt: Date
}

export function buildPrintableReportHtml(payload: PrintPayload) {
  const filename = reportFileName({
    reportType: payload.reportType,
    unitId: payload.unitId,
    extension: "pdf",
    generatedAt: payload.generatedAt,
  })
  const generatedAtText = format(payload.generatedAt, "yyyy-MM-dd HH:mm:ss")
  const reportTitle = reportTypeTitle(payload.reportType)
  const company = payload.companyName || "Technode"
  const brand = payload.companyLogoUrl
    ? `<img src="${escapeHtml(payload.companyLogoUrl)}" alt="${escapeHtml(company)}" />`
    : `<div class="brand-fallback">${escapeHtml(company)}</div>`

  const rawSummaryTable = `
    <table class="summary-table">
      <tbody>
        ${htmlSummaryRow("Total records in range", String(payload.rawReport.rows.length))}
        ${htmlSummaryRow("Date range", payload.dateRangeLabel)}
        ${htmlSummaryRow("Unit", payload.unitId)}
        ${htmlSummaryRow("Avg Energy", `${fixed(payload.rawReport.avgEnergy, 2)} kWh`)}
        ${htmlSummaryRow("Max Energy", `${fixed(payload.rawReport.maxEnergy, 2)} kWh`)}
        ${htmlSummaryRow("Avg Voltage", `${fixed(payload.rawReport.avgVoltage, 1)} V`)}
        ${htmlSummaryRow("Avg Current", `${fixed(payload.rawReport.avgCurrent, 2)} A`)}
      </tbody>
    </table>
  `

  const analyticalSummaryTable = `
    <table class="summary-table">
      <tbody>
        ${htmlSummaryRow("Analysis periods", String(payload.analyticalReport.summary.periodCount))}
        ${htmlSummaryRow("Total energy", `${fixedOrZero(payload.analyticalReport.summary.totalEnergyKwh, 2)} kWh`)}
        ${htmlSummaryRow("Average max load", `${fixedOrZero(payload.analyticalReport.summary.averageMaxLoadKw, 2)} kW`)}
        ${htmlSummaryRow("Average PF", fixedOrZero(payload.analyticalReport.summary.averagePf, 3))}
        ${htmlSummaryRow("Peak current", `${fixedOrZero(payload.analyticalReport.summary.peakCurrentOverallA, 2)} A`)}
        ${htmlSummaryRow("Max voltage", `${fixedOrZero(payload.analyticalReport.summary.maxVoltageOverallV, 1)} V`)}
      </tbody>
    </table>
  `

  const consumptionSummaryTable = `
    <table class="summary-table">
      <tbody>
        ${htmlSummaryRow("Time Period", payload.consumptionReport.summary.timePeriodLabel)}
        ${htmlSummaryRow("Total Energy Consumed", `${fixedOrZero(payload.consumptionReport.summary.totalEnergyKwh, 2)} kWh`)}
        ${htmlSummaryRow("Total Amount Spent", `INR ${fixedOrZero(payload.consumptionReport.summary.totalCostInr, 2)}`)}
        ${htmlSummaryRow("Unit Price", `INR ${fixedOrZero(payload.unitPrice, 2)}/kWh`)}
        ${htmlSummaryRow("Avg per period", `${fixedOrZero(payload.consumptionReport.summary.averageEnergyPerPeriod, 2)} kWh`)}
        ${htmlSummaryRow("Number of periods", String(payload.consumptionReport.summary.periodCount))}
      </tbody>
    </table>
  `

  const rawTableRows = payload.rawReport.previewRows
    .map((row) =>
      htmlRow([
        formatTimestampLabel(row.timestamp),
        fixed(row.kwh, 2),
        fixed(row.kvah, 2),
        fixed(row.kvarh, 2),
        fixed(row.voltageRn, 1),
        fixed(row.voltageYn, 1),
        fixed(row.voltageBn, 1),
        fixed(row.voltageRy, 1),
        fixed(row.voltageYb, 1),
        fixed(row.voltageBr, 1),
        fixed(row.currentR, 2),
        fixed(row.currentY, 2),
        fixed(row.currentB, 2),
        fixed(row.kwR, 2),
        fixed(row.kwY, 2),
        fixed(row.kwB, 2),
        fixed(row.pfR, 3),
        fixed(row.pfY, 3),
        fixed(row.pfB, 3),
        fixed(row.frequency, 2),
      ])
    )
    .join("")

  const analyticalTableRows = payload.analyticalReport.rows
    .map((row) =>
      htmlRow([
        row.periodLabel,
        fixedOrZero(row.energyKwh, 2),
        fixedOrZero(row.maxLoadKw, 2),
        fixedOrZero(row.avgPf, 3),
        fixedOrZero(row.peakCurrentA, 2),
        fixedOrZero(row.maxVoltageV, 1),
      ])
    )
    .join("")

  const consumptionTableRows = payload.consumptionReport.rows
    .map((row) =>
      htmlRow([
        row.periodLabel,
        fixedOrZero(row.energyKwh, 2),
        fixedOrZero(row.costInr, 2),
        `${fixedOrZero(row.percentage, 2)}%`,
      ])
    )
    .join("")

  const consumptionTotalRow = htmlRow([
    "Total",
    fixedOrZero(payload.consumptionReport.summary.totalEnergyKwh, 2),
    fixedOrZero(payload.consumptionReport.summary.totalCostInr, 2),
    "100.00%",
  ])

  const detailSection =
    payload.reportType === "raw"
      ? `
        <section>
          <h2>Summary Metrics</h2>
          ${rawSummaryTable}
        </section>
        <section>
          <h2>Detailed Rows (Latest 50)</h2>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th><th>kWh</th><th>kVAh</th><th>kVArh</th><th>V_RN</th><th>V_YN</th><th>V_BN</th><th>V_RY</th><th>V_YB</th><th>V_BR</th><th>I_R</th><th>I_Y</th><th>I_B</th><th>kW_R</th><th>kW_Y</th><th>kW_B</th><th>PF_R</th><th>PF_Y</th><th>PF_B</th><th>Freq</th>
              </tr>
            </thead>
            <tbody>${rawTableRows}</tbody>
          </table>
        </section>
      `
      : payload.reportType === "analytical"
        ? `
          <section>
            <h2>Summary Metrics</h2>
            ${analyticalSummaryTable}
          </section>
          <section>
            <h2>Period Analysis</h2>
            <table>
              <thead>
                <tr>
                  <th>Period</th><th>Energy (kWh)</th><th>Max Load (kW)</th><th>Avg PF</th><th>Peak Current (A)</th><th>Max Voltage (V)</th>
                </tr>
              </thead>
              <tbody>${analyticalTableRows}</tbody>
            </table>
          </section>
        `
        : `
          <section>
            <h2>Summary Metrics</h2>
            ${consumptionSummaryTable}
          </section>
          <section>
            <h2>Consumption Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th>Period</th><th>Energy (kWh)</th><th>Cost (INR)</th><th>Percent</th>
                </tr>
              </thead>
              <tbody>${consumptionTableRows}${consumptionTotalRow}</tbody>
            </table>
          </section>
        `

  return {
    filename,
    html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(filename)}</title>
    <style>
      @page {
        size: A4 landscape;
        margin: 12mm;
      }
      body {
        font-family: Arial, sans-serif;
        color: #111827;
        font-size: 12px;
        margin: 0;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #d1d5db;
        padding-bottom: 10px;
        margin-bottom: 14px;
      }
      .header img {
        max-height: 44px;
        max-width: 140px;
        object-fit: contain;
      }
      .brand-fallback {
        font-weight: 700;
        font-size: 16px;
      }
      h1 {
        margin: 0;
        font-size: 18px;
      }
      h2 {
        margin: 0 0 8px;
        font-size: 14px;
      }
      .sub {
        margin-top: 4px;
        color: #4b5563;
        font-size: 11px;
      }
      section {
        margin-bottom: 14px;
        break-inside: avoid;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        table-layout: fixed;
      }
      th,
      td {
        border: 1px solid #d1d5db;
        padding: 5px;
        text-align: left;
        word-break: break-word;
      }
      th {
        background: #f3f4f6;
        font-weight: 700;
      }
      .summary-table {
        width: 60%;
      }
      .summary-table th {
        width: 45%;
      }
      .footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        font-size: 10px;
        color: #6b7280;
        display: flex;
        justify-content: space-between;
        border-top: 1px solid #e5e7eb;
        padding-top: 4px;
      }
    </style>
  </head>
  <body>
    <header class="header">
      <div>
        <h1>${escapeHtml(reportTitle)}</h1>
        <p class="sub">Unit: ${escapeHtml(payload.unitId)} | Customer: ${escapeHtml(company)}</p>
        <p class="sub">Date Range: ${escapeHtml(payload.dateRangeLabel)} | Generated: ${escapeHtml(generatedAtText)}</p>
      </div>
      ${brand}
    </header>
    ${detailSection}
    <div class="footer">
      <span>Technode EMS</span>
      <span>Page <span class="pageNumber"></span></span>
    </div>
  </body>
</html>`,
  }
}
