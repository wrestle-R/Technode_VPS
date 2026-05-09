import type { MetricValue } from "@/components/customer/ems/types"

type LogRow = {
  id: string
  deviceTimestamp: string
  metrics: MetricValue[]
}

type EmsLogsTableProps = {
  effectiveMeterKey: string
  availableMeters: Array<{ meterKey: string; name: string }>
  onMeterChange: (nextMeterKey: string) => void
  metricColumns: Array<{ key: string; label: string; order: number }>
  selectedLogRows: LogRow[]
  pageIndex: number
  pageSize: number
  hasMore: boolean
  isPageLoading: boolean
  onPreviousPage: () => void
  onNextPage: () => void
}

export function EmsLogsTable({
  effectiveMeterKey,
  availableMeters,
  onMeterChange,
  metricColumns,
  selectedLogRows,
  pageIndex,
  pageSize,
  hasMore,
  isPageLoading,
  onPreviousPage,
  onNextPage,
}: EmsLogsTableProps) {
  const pageFrom = selectedLogRows.length > 0 ? pageIndex * pageSize + 1 : 0
  const pageTo = pageIndex * pageSize + selectedLogRows.length

  return (
    <div className="w-full max-w-full min-w-0 space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-r from-card to-muted/20 p-5 shadow-sm">
        <label className="grid gap-2 text-sm sm:max-w-xs">
          <span className="font-medium">Meter</span>
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
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full min-w-max divide-y divide-border text-sm">
          <thead className="bg-white/60">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Timestamp</th>
              {metricColumns.map((metric) => (
                <th
                  key={metric.key}
                  className="px-4 py-3 text-left font-medium"
                >
                  {metric.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {selectedLogRows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  {new Date(row.deviceTimestamp).toLocaleString()}
                </td>
                {metricColumns.map((metric) => {
                  const value = row.metrics.find(
                    (entry) => entry.key === metric.key
                  )?.value
                  return (
                    <td
                      key={`${row.id}-${metric.key}`}
                      className="px-4 py-3 font-mono"
                    >
                      {value ?? "-"}
                    </td>
                  )
                })}
              </tr>
            ))}
            {selectedLogRows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-5 text-muted-foreground"
                  colSpan={Math.max(metricColumns.length + 1, 2)}
                >
                  No logs available for the selected meter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <p>
            {selectedLogRows.length > 0
              ? `Showing logs ${pageFrom}-${pageTo} (page ${pageIndex + 1})`
              : `Page ${pageIndex + 1}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPreviousPage}
              disabled={pageIndex === 0 || isPageLoading}
              className="h-8 rounded-lg border border-border bg-white px-3 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={onNextPage}
              disabled={!hasMore || isPageLoading}
              className="h-8 rounded-lg border border-border bg-white px-3 disabled:opacity-50"
            >
              {isPageLoading ? "Loading..." : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
