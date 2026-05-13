"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Trash2, Wifi, Zap } from "lucide-react"
import { toast } from "sonner"

import type {
  CustomerUnitDetail,
  CustomerUnitSummary,
} from "@/components/customer/ems/types"
import type { AlertRule } from "@/components/customer/alerts/types"
import { Button } from "@/components/ui/button"

type RulesResponse = {
  rows: AlertRule[]
}

type UnitsResponse = {
  units: CustomerUnitSummary[]
}

type UnitResponse = {
  unit: CustomerUnitDetail
}

const metricFieldOptions = [
  "VRN",
  "VYN",
  "VBN",
  "VRY",
  "VYB",
  "VBR",
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

type RuleForm = {
  id: string | null
  unitId: string
  type: "metric" | "offline"
  severity: "critical" | "warning" | "info"
  enabled: boolean
  meterScope: "single" | "multiple" | "all"
  meterKeys: string[]
  fieldKey: string
  direction: "above" | "below"
  thresholdValue: string
}

const defaultForm: RuleForm = {
  id: null,
  unitId: "",
  type: "metric",
  severity: "warning",
  enabled: true,
  meterScope: "all",
  meterKeys: [],
  fieldKey: "VRN",
  direction: "above",
  thresholdValue: "0",
}

export function AlertSettingsPageClient() {
  const [units, setUnits] = useState<CustomerUnitSummary[]>([])
  const [rules, setRules] = useState<AlertRule[]>([])
  const [meterOptions, setMeterOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshingRules, setIsRefreshingRules] = useState(false)
  const [form, setForm] = useState<RuleForm>(defaultForm)

  const fetchUnits = useCallback(async () => {
    const response = await fetch("/api/customer/ems", { cache: "no-store" })
    if (!response.ok) {
      throw new Error("Unable to load EMS units")
    }

    const data = (await response.json()) as UnitsResponse
    const nextUnits = data.units ?? []
    setUnits(nextUnits)

    if (!form.unitId && nextUnits[0]?.unitId) {
      setForm((current) => ({
        ...current,
        unitId: nextUnits[0]!.unitId,
      }))
    }
  }, [form.unitId])

  const fetchRules = useCallback(async () => {
    const response = await fetch("/api/customer/alerts/rules", { cache: "no-store" })
    if (!response.ok) {
      throw new Error("Unable to load alert rules")
    }

    const data = (await response.json()) as RulesResponse
    setRules(data.rows ?? [])
  }, [])

  const fetchMeters = useCallback(async (unitId: string) => {
    if (!unitId) {
      setMeterOptions([])
      return
    }

    try {
      const response = await fetch(`/api/customer/ems/${encodeURIComponent(unitId)}`, {
        cache: "no-store",
      })

      if (!response.ok) {
        setMeterOptions([])
        return
      }

      const data = (await response.json()) as UnitResponse
      const nextMeterOptions = (data.unit?.latestMeters ?? []).map((meter) => meter.meterKey)
      setMeterOptions(nextMeterOptions)

      setForm((current) => {
        if (current.meterScope === "all") {
          return current
        }

        const filtered = current.meterKeys.filter((key) => nextMeterOptions.includes(key))
        return {
          ...current,
          meterKeys: filtered,
        }
      })
    } catch {
      setMeterOptions([])
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        await Promise.all([fetchUnits(), fetchRules()])
      } catch {
        if (!cancelled) {
          toast.error("Unable to load alert settings")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [fetchRules, fetchUnits])

  useEffect(() => {
    void fetchMeters(form.unitId)
  }, [fetchMeters, form.unitId])

  const submitLabel = useMemo(() => {
    if (isSubmitting) {
      return form.id ? "Saving..." : "Creating..."
    }

    return form.id ? "Save Rule" : "Create Rule"
  }, [form.id, isSubmitting])

  const payload = useMemo(() => {
    const threshold = Number.parseFloat(form.thresholdValue)

    return {
      unitId: form.unitId,
      type: form.type,
      severity: form.severity,
      enabled: form.enabled,
      meterScope: form.meterScope,
      meterKeys: form.meterScope === "all" ? [] : form.meterKeys,
      fieldKey: form.type === "metric" ? form.fieldKey : null,
      direction: form.type === "metric" ? form.direction : null,
      thresholdValue: form.type === "metric" ? threshold : null,
    }
  }, [form])

  const submit = async () => {
    if (!form.unitId) {
      toast.error("Please select a unit")
      return
    }

    if ((form.meterScope === "single" || form.meterScope === "multiple") && form.meterKeys.length === 0) {
      toast.error("Please select meter keys")
      return
    }

    if (form.type === "metric" && !Number.isFinite(Number.parseFloat(form.thresholdValue))) {
      toast.error("Threshold must be a valid number")
      return
    }

    setIsSubmitting(true)
    try {
      const route = form.id
        ? `/api/customer/alerts/rules/${form.id}`
        : "/api/customer/alerts/rules"
      const method = form.id ? "PATCH" : "POST"

      const response = await fetch(route, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast.error(data.error ?? "Unable to save rule")
        return
      }

      await fetchRules()
      toast.success(form.id ? "Rule updated" : "Rule created")
      setForm((current) => ({ ...defaultForm, unitId: current.unitId || units[0]?.unitId || "" }))
    } catch {
      toast.error("Unable to save rule")
    } finally {
      setIsSubmitting(false)
    }
  }

  const onEditRule = (rule: AlertRule) => {
    setForm({
      id: rule.id,
      unitId: rule.unitId,
      type: rule.type,
      severity: rule.severity,
      enabled: rule.enabled,
      meterScope: rule.meterScope,
      meterKeys: rule.meterKeys,
      fieldKey: rule.fieldKey ?? "VRN",
      direction: rule.direction ?? "above",
      thresholdValue: rule.thresholdValue != null ? String(rule.thresholdValue) : "0",
    })
  }

  const onDeleteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/customer/alerts/rules/${ruleId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        toast.error("Unable to delete rule")
        return
      }

      await fetchRules()
      toast.success("Rule deleted")
      if (form.id === ruleId) {
        setForm((current) => ({ ...defaultForm, unitId: current.unitId || units[0]?.unitId || "" }))
      }
    } catch {
      toast.error("Unable to delete rule")
    }
  }

  const meterSelectionDisabled = form.meterScope === "all" || meterOptions.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Alert Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure threshold and offline rules per unit and meter scope.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsRefreshingRules(true)
            void fetchRules().finally(() => setIsRefreshingRules(false))
          }}
          disabled={isRefreshingRules}
        >
          {isRefreshingRules ? "Refreshing..." : "Refresh Rules"}
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">{form.id ? "Edit Rule" : "Create Rule"}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Unit
            <select
              className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm font-normal tracking-normal text-foreground"
              value={form.unitId}
              onChange={(event) => setForm((current) => ({ ...current, unitId: event.target.value }))}
            >
              {units.map((unit) => (
                <option key={unit.unitId} value={unit.unitId}>
                  {unit.unitId}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Type
            <select
              className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm font-normal tracking-normal text-foreground"
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as RuleForm["type"] }))}
            >
              <option value="metric">Metric</option>
              <option value="offline">Device Offline</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Severity
            <select
              className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm font-normal tracking-normal text-foreground"
              value={form.severity}
              onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value as RuleForm["severity"] }))}
            >
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Meter Scope
            <select
              className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm font-normal tracking-normal text-foreground"
              value={form.meterScope}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  meterScope: event.target.value as RuleForm["meterScope"],
                  meterKeys:
                    event.target.value === "single"
                      ? current.meterKeys.slice(0, 1)
                      : current.meterKeys,
                }))
              }
            >
              <option value="all">All Meters in Unit</option>
              <option value="single">Single Meter</option>
              <option value="multiple">Multiple Meters</option>
            </select>
          </label>
        </div>

        <div className="mt-3 rounded-xl border border-border/70 bg-muted/20 p-3">
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Meter Keys
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {meterOptions.length === 0 ? (
              <span className="text-xs text-muted-foreground">No meters found for selected unit.</span>
            ) : (
              meterOptions.map((meterKey) => {
                const selected = form.meterKeys.includes(meterKey)
                return (
                  <button
                    key={meterKey}
                    type="button"
                    className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                      selected
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                    } ${meterSelectionDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-muted"}`}
                    onClick={() => {
                      if (meterSelectionDisabled) {
                        return
                      }

                      setForm((current) => {
                        const has = current.meterKeys.includes(meterKey)
                        if (current.meterScope === "single") {
                          return {
                            ...current,
                            meterKeys: has ? [] : [meterKey],
                          }
                        }

                        if (has) {
                          return {
                            ...current,
                            meterKeys: current.meterKeys.filter((item) => item !== meterKey),
                          }
                        }

                        return {
                          ...current,
                          meterKeys: [...current.meterKeys, meterKey],
                        }
                      })
                    }}
                  >
                    {meterKey}
                  </button>
                )
              })
            )}
          </div>
          {form.meterScope === "all" ? (
            <p className="mt-2 text-[11px] text-muted-foreground">All meters in selected unit will be evaluated.</p>
          ) : null}
        </div>

        {form.type === "metric" ? (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Field Key
              <select
                className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm font-normal tracking-normal text-foreground"
                value={form.fieldKey}
                onChange={(event) => setForm((current) => ({ ...current, fieldKey: event.target.value }))}
              >
                {metricFieldOptions.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Direction
              <select
                className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm font-normal tracking-normal text-foreground"
                value={form.direction}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    direction: event.target.value as RuleForm["direction"],
                  }))
                }
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Threshold
              <input
                className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm font-normal tracking-normal text-foreground"
                value={form.thresholdValue}
                onChange={(event) => setForm((current) => ({ ...current, thresholdValue: event.target.value }))}
                placeholder="e.g. 250"
              />
            </label>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
            />
            Rule Enabled
          </label>
          <Button
            size="sm"
            onClick={() => {
              void submit()
            }}
            disabled={isSubmitting}
          >
            {form.id ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {submitLabel}
          </Button>
          {form.id ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setForm((current) => ({ ...defaultForm, unitId: current.unitId || units[0]?.unitId || "" }))}
            >
              Reset Form
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Configured Rules</h2>
        </div>
        {isLoading ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">No alert rules configured yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs tracking-[0.1em] text-muted-foreground uppercase">
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Severity</th>
                  <th className="px-3 py-3">Scope</th>
                  <th className="px-3 py-3">Condition</th>
                  <th className="px-3 py-3">Enabled</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-b border-border/70">
                    <td className="px-4 py-3 font-medium">{rule.unitId}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1">
                        {rule.type === "metric" ? (
                          <Zap className="h-3.5 w-3.5 text-amber-600" />
                        ) : (
                          <Wifi className="h-3.5 w-3.5 text-rose-600" />
                        )}
                        {rule.type === "metric" ? "Metric" : "Offline"}
                      </span>
                    </td>
                    <td className="px-3 py-3">{rule.severity}</td>
                    <td className="px-3 py-3">
                      {rule.meterScope}
                      {rule.meterScope !== "all" && rule.meterKeys.length > 0
                        ? ` (${rule.meterKeys.join(", ")})`
                        : ""}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {rule.type === "metric"
                        ? `${rule.fieldKey} ${rule.direction} ${rule.thresholdValue}`
                        : "Device connection status is Offline"}
                    </td>
                    <td className="px-3 py-3">{rule.enabled ? "Yes" : "No"}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => onEditRule(rule)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => {
                            void onDeleteRule(rule.id)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
