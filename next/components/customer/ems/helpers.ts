import type { MetricValue, TrendPoint } from "@/components/customer/ems/types"

export const phaseColors = {
  red: "#ef4444",
  amber: "#f59e0b",
  green: "#22c55e",
  blue: "#2b3242",
  blueLight: "#3b4356",
  indigo: "#6366f1",
  cyan: "#06b6d4",
}

export const chartGradients = {
  blue: {
    from: phaseColors.blue,
    to: phaseColors.blueLight,
  },
}

export const LOG_WINDOW_SIZE = 30
export const LOG_SCOPE_LIMIT = 50

export function getPagedTrendRows(rows: TrendPoint[], page: number) {
  const scoped = rows.slice(-LOG_SCOPE_LIMIT)
  const totalPages = Math.max(1, Math.ceil(scoped.length / LOG_WINDOW_SIZE))
  const activePage = Math.min(Math.max(page, 0), totalPages - 1)
  const end = scoped.length - activePage * LOG_WINDOW_SIZE
  const start = Math.max(end - LOG_WINDOW_SIZE, 0)

  return {
    rows: scoped.slice(start, end),
    totalPages,
    activePage,
    from: scoped.length === 0 ? 0 : start + 1,
    to: end,
    total: scoped.length,
  }
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
  return `rounded-2xl bg-linear-to-r from-[#2b3242] to-[#2b3242] p-[1px] shadow-[0_20px_30px_-20px_rgba(43,50,66,0.9)] ${extra ?? ""}`
}

export function reportsGradientCardClassName(extra?: string) {
  return `rounded-2xl bg-linear-to-r from-[#2b3242] to-[#2b3242] p-[1px] shadow-[0_20px_30px_-20px_rgba(43,50,66,0.9)] ${extra ?? ""}`
}

export function statusClasses(status: string) {
  return status.toLowerCase() === "online"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700"
}
