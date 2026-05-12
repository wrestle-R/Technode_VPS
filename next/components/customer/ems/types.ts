export type MetricValue = {
  key: string
  label: string
  order: number
  value: number | null
}

export type MeterEntry = {
  meterKey: string
  name: string
  label: string | null
  metrics: MetricValue[]
}

export type UnitLog = {
  id: string
  deviceTimestamp: string
  status: string
  meters: MeterEntry[]
}

export type CustomerUnitSummary = {
  id: string
  unitId: string
  status: string
  locationLabel: string | null
  latitude: number | null
  longitude: number | null
  deviceType: string | null
  lastSeenAt: string | null
  meterCount: number
}

export type CustomerUnitDetail = {
  id: string
  unitId: string
  status: string
  locationLabel: string | null
  latitude: number | null
  longitude: number | null
  deviceType: string | null
  lastSeenAt: string | null
  latestMeters: MeterEntry[]
  logs: UnitLog[]
}

export type TrendPoint = {
  timestamp: string
  label: string
  [key: string]: number | string | null
}

export type StatSeries = {
  max: number | null
  min: number | null
  avg: number | null
}

export type SummaryStats = {
  voltage: StatSeries
  current: StatSeries
  power: StatSeries
  powerFactor: StatSeries
}

export type SummaryRange = "24h" | "7d" | "30d"

export type HourlyCurrentPoint = {
  timestamp: string
  hour: string
  averageCurrent: number | null
}

export type HourlyCurrentStats = {
  points: HourlyCurrentPoint[]
  computedAt: string
}

export type HourlyVoltagePoint = {
  timestamp: string
  hour: string
  averageVoltageLL: number | null
  averageVoltageLN: number | null
}

export type HourlyVoltageStats = {
  points: HourlyVoltagePoint[]
  computedAt: string
}

export type ReportRange = "24h" | "7d" | "30d" | "custom"

export type ReportType = "raw" | "analytical" | "consumption"

export type ConsumptionRange = "daily" | "weekly" | "monthly"

export type ReportExportFormat = "csv" | "pdf"

export type EnergyDailyRange = "3d" | "7d" | "30d"

export type EnergyCumulativePoint = {
  timestamp: string
  label: string
  kwh: number
}

export type EnergyDailyConsumptionPoint = {
  date: string
  label: string
  consumption: number
}

export type EnergyMonthlyAveragePoint = {
  month: string
  label: string
  averageConsumption: number
}

export type EnergyHourlyConsumptionPoint = {
  hour: string
  label: string
  consumption: number
}

export type EnergyAnalytics = {
  monthlyCumulative: EnergyCumulativePoint[]
  dailyConsumption: EnergyDailyConsumptionPoint[]
  monthlyAverage: EnergyMonthlyAveragePoint[]
  hourlyConsumption: EnergyHourlyConsumptionPoint[]
  generatedAt: string
}
