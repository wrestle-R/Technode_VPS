"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Bell, Eye, Filter, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import type { AlertInstance } from "@/components/customer/alerts/types"
import { Button } from "@/components/ui/button"

type AlertsResponse = {
  rows: AlertInstance[]
  page: number
  limit: number
  total: number
}

function severityClass(value: AlertInstance["severity"]) {
  if (value === "critical") {
    return "border-red-400/30 bg-red-500/10 text-red-700"
  }
  if (value === "warning") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-700"
  }
  return "border-sky-400/30 bg-sky-500/10 text-sky-700"
}

function statusClass(value: AlertInstance["status"]) {
  if (value === "open") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-700"
  }
  return "border-slate-400/30 bg-slate-500/10 text-slate-700"
}

export function AlertsPageClient() {
  const [rows, setRows] = useState<AlertInstance[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filters, setFilters] = useState({
    status: "",
    severity: "",
    type: "",
    seen: "",
    unitId: "",
    meterKey: "",
  })

  const fetchAlerts = useCallback(
    async (loading = true) => {
      if (loading) {
        setIsLoading(true)
      }

      try {
        const params = new URLSearchParams()
        params.set("page", String(page))
        params.set("limit", String(limit))

        if (filters.status) params.set("status", filters.status)
        if (filters.severity) params.set("severity", filters.severity)
        if (filters.type) params.set("type", filters.type)
        if (filters.seen) params.set("seen", filters.seen)
        if (filters.unitId) params.set("unitId", filters.unitId)
        if (filters.meterKey) params.set("meterKey", filters.meterKey)

        const response = await fetch(`/api/customer/alerts?${params.toString()}`, {
          cache: "no-store",
        })

        if (!response.ok) {
          toast.error("Unable to load alerts")
          return
        }

        const data = (await response.json()) as AlertsResponse
        setRows(data.rows ?? [])
        setTotal(data.total ?? 0)
      } catch {
        toast.error("Unable to load alerts")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [filters, limit, page]
  )

  useEffect(() => {
    void fetchAlerts(true)
  }, [fetchAlerts])

  const markSeen = async (id: string) => {
    try {
      const response = await fetch(`/api/customer/alerts/${id}/seen`, {
        method: "POST",
      })

      if (!response.ok) {
        toast.error("Unable to mark alert as seen")
        return
      }

      setRows((current) => current.map((item) => (item.id === id ? { ...item, seenAt: new Date().toISOString() } : item)))
      toast.success("Alert marked as seen")
    } catch {
      toast.error("Unable to mark alert as seen")
    }
  }

  const markAllSeen = async () => {
    setIsMarkingAll(true)
    try {
      const response = await fetch("/api/customer/alerts/mark-all-seen", {
        method: "POST",
      })

      if (!response.ok) {
        toast.error("Unable to mark alerts as seen")
        return
      }

      await fetchAlerts(false)
      toast.success("All open alerts marked as seen")
    } catch {
      toast.error("Unable to mark alerts as seen")
    } finally {
      setIsMarkingAll(false)
    }
  }

  const totalPages = useMemo(() => {
    if (total <= 0) return 1
    return Math.max(Math.ceil(total / limit), 1)
  }, [limit, total])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Monitor triggered alerts, filter by severity/type, and mark alerts as seen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsRefreshing(true)
              void fetchAlerts(false)
            }}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void markAllSeen()
            }}
            disabled={isMarkingAll}
          >
            <Eye className="h-4 w-4" />
            Mark All Seen
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <select
            className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm"
            value={filters.status}
            onChange={(event) => {
              setPage(1)
              setFilters((prev) => ({ ...prev, status: event.target.value }))
            }}
          >
            <option value="">Status (All)</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm"
            value={filters.severity}
            onChange={(event) => {
              setPage(1)
              setFilters((prev) => ({ ...prev, severity: event.target.value }))
            }}
          >
            <option value="">Severity (All)</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select
            className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm"
            value={filters.type}
            onChange={(event) => {
              setPage(1)
              setFilters((prev) => ({ ...prev, type: event.target.value }))
            }}
          >
            <option value="">Type (All)</option>
            <option value="metric">Metric</option>
            <option value="offline">Device Offline</option>
          </select>
          <select
            className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm"
            value={filters.seen}
            onChange={(event) => {
              setPage(1)
              setFilters((prev) => ({ ...prev, seen: event.target.value }))
            }}
          >
            <option value="">Seen (All)</option>
            <option value="false">Unseen</option>
            <option value="true">Seen</option>
          </select>
          <input
            className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm"
            placeholder="Unit ID"
            value={filters.unitId}
            onChange={(event) => {
              setPage(1)
              setFilters((prev) => ({ ...prev, unitId: event.target.value }))
            }}
          />
          <input
            className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm"
            placeholder="Meter Key"
            value={filters.meterKey}
            onChange={(event) => {
              setPage(1)
              setFilters((prev) => ({ ...prev, meterKey: event.target.value }))
            }}
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-[0.1em]">
              <th className="px-4 py-3">Triggered</th>
              <th className="px-3 py-3">Unit</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Severity</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Message</th>
              <th className="px-3 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                  Loading alerts...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                  No alerts found for current filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border/70">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(row.triggeredAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 font-medium">{row.unitId}</td>
                  <td className="px-3 py-3">{row.type === "metric" ? "Metric" : "Device Offline"}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${severityClass(row.severity)}`}>
                      {row.severity}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    <div className="max-w-[360px] whitespace-normal">{row.message}</div>
                    <div className="mt-1 text-[11px]">
                      {row.meterKey ? `Meter: ${row.meterKey}` : "Unit-level"}
                      {row.fieldKey ? `, Field: ${row.fieldKey}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        void markSeen(row.id)
                      }}
                      disabled={Boolean(row.seenAt)}
                    >
                      <Bell className="h-3.5 w-3.5" />
                      {row.seenAt ? "Seen" : "Mark Seen"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setPage((value) => Math.max(value - 1, 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span>
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
