import type { MetricValue } from "@/components/customer/ems/types"

type LogRow = {
  id: string
  deviceTimestamp: string
  metrics: MetricValue[]
}

export function EmsLogsTable({
  effectiveRtuKey,
  availableRtus,
  onRtuChange,
  metricColumns,
  selectedLogRows,
}: {
  effectiveRtuKey: string
  availableRtus: Array<{ rtuKey: string; nickname: string }>
  onRtuChange: (nextRtuKey: string) => void
  metricColumns: Array<{ key: string; label: string; order: number }>
  selectedLogRows: LogRow[]
}) {
  return (
    <div className="w-full max-w-full min-w-0 space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-r from-card to-muted/20 p-5 shadow-sm">
        <label className="grid gap-2 text-sm sm:max-w-xs">
          <span className="font-medium">Meter</span>
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
      </div>
    </div>
  )
}
