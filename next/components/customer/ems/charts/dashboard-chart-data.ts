import { average } from "@/components/customer/ems/helpers"
import type {
  EnergyAnalytics,
  HourlyCurrentPoint,
  HourlyVoltagePoint,
  TrendPoint,
} from "@/components/customer/ems/types"

export type DashboardPoint = {
  label: string
  timestamp: string
  voltage: number | null
  amperage: number | null
  frequency: number | null
}

export type EnergyPoint = {
  label: string
  consumption: number
}

function numberMetric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function latestValue(
  points: DashboardPoint[],
  key: keyof DashboardPoint
) {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const value = points[index]?.[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
  }

  return null
}

export function buildDashboardPoints(
  trendRows: TrendPoint[]
): DashboardPoint[] {
  return trendRows.slice(-72).map((row) => {
    const voltage =
      average([
        numberMetric(row.VRN),
        numberMetric(row.VYN),
        numberMetric(row.VBN),
      ]) ??
      average([
        numberMetric(row.VRY),
        numberMetric(row.VYB),
        numberMetric(row.VBR),
      ])

    return {
      label: String(row.label),
      timestamp: String(row.timestamp),
      voltage,
      amperage: average([
        numberMetric(row.IR),
        numberMetric(row.IY),
        numberMetric(row.IB),
      ]),
      frequency: numberMetric(row.Freq),
    }
  })
}

export function buildAmperagePoints(
  trendRows: TrendPoint[],
  hourlyCurrentPoints: HourlyCurrentPoint[]
): DashboardPoint[] {
  const hasHourlyCurrent = hourlyCurrentPoints.some(
    (point) => typeof point.averageCurrent === "number"
  )

  if (!hasHourlyCurrent) {
    return buildDashboardPoints(trendRows)
  }

  return hourlyCurrentPoints.map((point) => ({
    label: point.hour,
    timestamp: point.timestamp,
    voltage: null,
    amperage: point.averageCurrent,
    frequency: null,
  }))
}

export function buildVoltagePoints(
  trendRows: TrendPoint[],
  hourlyVoltagePoints: HourlyVoltagePoint[]
): DashboardPoint[] {
  const hasHourlyVoltage = hourlyVoltagePoints.some(
    (point) =>
      typeof point.averageVoltageLN === "number" ||
      typeof point.averageVoltageLL === "number"
  )

  if (!hasHourlyVoltage) {
    return buildDashboardPoints(trendRows)
  }

  return hourlyVoltagePoints.map((point) => ({
    label: point.hour,
    timestamp: point.timestamp,
    voltage: point.averageVoltageLN ?? point.averageVoltageLL,
    amperage: null,
    frequency: null,
  }))
}

export function buildEnergyPoints(
  analytics: EnergyAnalytics | null,
  trendRows: TrendPoint[]
): EnergyPoint[] {
  if (analytics?.dailyConsumption.length) {
    return analytics.dailyConsumption.slice(-7).map((point) => ({
      label: point.label,
      consumption: point.consumption,
    }))
  }

  const kwhRows = trendRows
    .slice(-7)
    .map((row) => ({
      label: String(row.label),
      value: numberMetric(row.Kwh),
    }))
    .filter((row): row is { label: string; value: number } => row.value != null)

  return kwhRows.map((row, index) => {
    const previous = kwhRows[index - 1]?.value
    return {
      label: row.label,
      consumption: previous == null ? 0 : Math.max(row.value - previous, 0),
    }
  })
}
