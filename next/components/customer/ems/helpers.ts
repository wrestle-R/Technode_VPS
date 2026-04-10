import type { MetricValue, TrendPoint } from "@/components/customer/ems/types"

export const phaseColors = {
  red: "#ef4444",
  amber: "#f59e0b",
  green: "#22c55e",
  blue: "#3b82f6",
  indigo: "#6366f1",
  cyan: "#06b6d4",
}

export function toFinite(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function average(values: Array<number | null>) {
  const usable = values.filter((value): value is number => value != null)
  if (usable.length === 0) {
    return null
  }

  return usable.reduce((sum, value) => sum + value, 0) / usable.length
}

export function firstMetric(row: { metrics: MetricValue[] }, key: string) {
  return toFinite(row.metrics.find((metric) => metric.key === key)?.value)
}

export function buildTrendRows(
  rows: Array<{ deviceTimestamp: string; metrics: MetricValue[] }>
) {
  return rows
    .slice()
    .reverse()
    .map((row) => {
      const timestamp = row.deviceTimestamp
      const when = new Date(timestamp)
      return {
        timestamp,
        label: when.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        VRY: firstMetric(row, "VRY"),
        VYB: firstMetric(row, "VYB"),
        VBR: firstMetric(row, "VBR"),
        VRN: firstMetric(row, "VRN"),
        VYN: firstMetric(row, "VYN"),
        VBN: firstMetric(row, "VBN"),
        IR: firstMetric(row, "IR"),
        IY: firstMetric(row, "IY"),
        IB: firstMetric(row, "IB"),
        Kwh: firstMetric(row, "Kwh"),
        KvAh: firstMetric(row, "KvAh"),
        KvArh: firstMetric(row, "KvArh"),
        ["KW-R"]: firstMetric(row, "KW-R"),
        ["KW-Y"]: firstMetric(row, "KW-Y"),
        ["KW-B"]: firstMetric(row, "KW-B"),
        ["PF-R"]: firstMetric(row, "PF-R"),
        ["PF-Y"]: firstMetric(row, "PF-Y"),
        ["PF-B"]: firstMetric(row, "PF-B"),
        Freq: firstMetric(row, "Freq"),
      }
    })
}

export function metricValueFromLatest(series: TrendPoint[], key: string) {
  const value = series[series.length - 1]?.[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function gaugeColor(
  value: number | null,
  goodThreshold: number,
  warningThreshold: number
) {
  if (value == null) {
    return "#94a3b8"
  }
  if (value >= goodThreshold) {
    return "#22c55e"
  }
  if (value >= warningThreshold) {
    return "#f59e0b"
  }
  return "#ef4444"
}

export function formatNumber(value: number | null, digits = 2) {
  return value == null ? "-" : value.toFixed(digits)
}

export function gradientCardClassName(extra?: string) {
  return `rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 p-[1px] shadow-[0_18px_30px_-20px_rgba(5,150,105,0.72)] ${extra ?? ""}`
}

export function reportsGradientCardClassName(extra?: string) {
  return `rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 p-[1px] shadow-[0_18px_30px_-20px_rgba(5,150,105,0.72)] ${extra ?? ""}`
}

export function statusClasses(status: string) {
  return status.toLowerCase() === "online"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700"
}
