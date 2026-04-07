"use client"

import dynamic from "next/dynamic"
import { MapPin, Save, SlidersHorizontal } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { EmsFieldTemplateEntry, EmsRtuOverrides } from "@/lib/ems/types"

type CustomerOption = {
  customer_id: number
  customer_representative: string | null
  email: string
  company: {
    name: string
  }
}

type MetricRow = {
  key: string
  label: string
  order: number
  value: number | null
}

type RtuRow = {
  rtuKey: string
  nickname: string
  slave: string | null
  fieldTemplate: EmsFieldTemplateEntry[]
  metrics: MetricRow[]
}

type UnitEditorProps = {
  unit: {
    unitId: string
    customerId: number | null
    locationLabel: string | null
    latitude: number | null
    longitude: number | null
    status: string
    deviceType: string | null
    lastSeenAt: string | null
    topicPath: string | null
    unitFieldTemplate: EmsFieldTemplateEntry[]
    rtuOverrides: EmsRtuOverrides
    rtus: RtuRow[]
  }
  customers: CustomerOption[]
}

const UnitMapPicker = dynamic(
  () => import("@/components/admin/ems/unit-map-picker").then((module) => module.UnitMapPicker),
  { ssr: false }
)

function formatMetricValue(value: number | null) {
  return value == null ? "—" : String(value)
}

export function AdminEmsUnitEditor({ unit, customers }: UnitEditorProps) {
  const [saving, setSaving] = useState(false)
  const [customerId, setCustomerId] = useState<string>(unit.customerId ? String(unit.customerId) : "")
  const [locationLabel, setLocationLabel] = useState(unit.locationLabel ?? "")
  const [latitude, setLatitude] = useState(unit.latitude?.toString() ?? "")
  const [longitude, setLongitude] = useState(unit.longitude?.toString() ?? "")
  const [unitTemplate, setUnitTemplate] = useState<EmsFieldTemplateEntry[]>(
    unit.unitFieldTemplate.slice().sort((a, b) => a.order - b.order)
  )
  const [rtus, setRtus] = useState<RtuRow[]>(unit.rtus)

  const latestValuesByRtu = useMemo(() => {
    return rtus.reduce<Record<string, Record<string, number | null>>>((accumulator, rtu) => {
      accumulator[rtu.rtuKey] = rtu.metrics.reduce<Record<string, number | null>>((metricMap, metric) => {
        metricMap[metric.key] = metric.value
        return metricMap
      }, {})
      return accumulator
    }, {})
  }, [rtus])

  function updateRtuNickname(rtuKey: string, nickname: string) {
    setRtus((prev) => prev.map((rtu) => (rtu.rtuKey === rtuKey ? { ...rtu, nickname } : rtu)))
  }

  function updateUnitField(
    fieldKey: string,
    key: keyof Pick<EmsFieldTemplateEntry, "label" | "visible">,
    value: string | boolean
  ) {
    setUnitTemplate((prev) =>
      prev.map((field) =>
        field.key === fieldKey
          ? {
              ...field,
              [key]: value,
            }
          : field
      )
    )
  }

  function updateCoordinates(next: { latitude: number; longitude: number }) {
    setLatitude(next.latitude.toFixed(6))
    setLongitude(next.longitude.toFixed(6))
  }

  async function save() {
    setSaving(true)

    const rtuOverrides = rtus.reduce<EmsRtuOverrides>((accumulator, rtu) => {
      accumulator[rtu.rtuKey] = {
        nickname: rtu.nickname.trim() || undefined,
      }
      return accumulator
    }, {})

    try {
      const response = await fetch(`/api/admin/ems/${encodeURIComponent(unit.unitId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customerId ? Number(customerId) : null,
          locationLabel,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          unitFieldTemplate: unitTemplate,
          rtuOverrides,
        }),
      })

      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast.error(data.error ?? "Failed to save EMS unit")
        return
      }

      toast.success("EMS unit updated")
      window.location.reload()
    } catch {
      toast.error("Failed to save EMS unit")
    } finally {
      setSaving(false)
    }
  }

  const mapHref =
    latitude && longitude
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`
      : null

  const mapLatitude = Number.isFinite(Number(latitude)) ? Number(latitude) : 20.5937
  const mapLongitude = Number.isFinite(Number(longitude)) ? Number(longitude) : 78.9629

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-xl">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.16),transparent_42%),linear-gradient(135deg,rgba(79,70,229,0.08),transparent_60%)] p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Unit Settings</p>
              <h2 className="mt-2 text-2xl font-semibold">{unit.unitId}</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Assign the unit, place it on the map, rename meters, and manage one shared field layout for the whole unit.
              </p>
            </div>
            <Button onClick={save} disabled={saving} size="lg" className="shadow-lg shadow-primary/20">
              <Save className="mr-1" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Customer</span>
                <select
                  className="h-11 rounded-2xl border border-input bg-background px-4"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {customers.map((customer) => (
                    <option key={customer.customer_id} value={customer.customer_id}>
                      {customer.company.name} - {customer.customer_representative ?? customer.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Location Label</span>
                <input
                  className="h-11 rounded-2xl border border-input bg-background px-4"
                  value={locationLabel}
                  onChange={(event) => setLocationLabel(event.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Latitude</span>
                <input
                  className="h-11 rounded-2xl border border-input bg-background px-4"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Longitude</span>
                <input
                  className="h-11 rounded-2xl border border-input bg-background px-4"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Status</p>
                <p className="mt-2 text-base font-semibold">{unit.status}</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Device Type</p>
                <p className="mt-2 text-base font-semibold">{unit.deviceType ?? "-"}</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Last Seen</p>
                <p className="mt-2 text-sm font-semibold">{unit.lastSeenAt ? new Date(unit.lastSeenAt).toLocaleString() : "-"}</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Topic</p>
                <p className="mt-2 break-all text-sm font-semibold">{unit.topicPath ?? "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <MapPin className="size-4 text-primary" />
              {mapHref ? (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open Map
                </a>
              ) : (
                <span className="text-muted-foreground">Pick a location from the map or enter coordinates manually.</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 text-primary" />
              <span>Drag the marker or click on the map to update coordinates.</span>
            </div>
            <div className="overflow-hidden rounded-[28px] border border-border/70 bg-muted/20 shadow-inner">
              <UnitMapPicker latitude={mapLatitude} longitude={mapLongitude} onChange={updateCoordinates} />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Meters</h2>
            <p className="text-sm text-muted-foreground">
              Rename each meter here. Field labels and visibility are shared across the whole unit below.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {rtus.map((rtu) => (
            <article
              key={rtu.rtuKey}
              className="rounded-[28px] border border-border/70 bg-card p-5 shadow-lg transition hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Meter</p>
                  <h3 className="mt-1 text-xl font-semibold">{rtu.slave ?? rtu.rtuKey}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">RTU key: {rtu.rtuKey}</p>
                </div>
                <div className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {rtu.metrics.length} mapped fields
                </div>
              </div>

              <label className="mt-5 grid gap-2 text-sm">
                <span className="font-medium">Nickname</span>
                <input
                  className="h-11 rounded-2xl border border-input bg-background px-4"
                  value={rtu.nickname}
                  onChange={(event) => updateRtuNickname(rtu.rtuKey, event.target.value)}
                />
              </label>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-xl">
        <div className="bg-[linear-gradient(135deg,rgba(79,70,229,0.08),transparent_60%)] p-6 md:p-8">
          <h2 className="text-lg font-semibold">Shared Field Setup</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This layout applies to every meter in this unit. Turn a field off here and it disappears from the customer pages for all meters.
          </p>
        </div>

        <div className="overflow-x-auto p-6 md:p-8">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="rounded-l-2xl px-4 py-3 font-medium">Field</th>
                <th className="px-4 py-3 font-medium">Customer Label</th>
                {rtus.map((rtu) => (
                  <th key={`header-${rtu.rtuKey}`} className="px-4 py-3 font-medium">
                    {rtu.nickname.trim() || rtu.slave || `RTU ${rtu.rtuKey}`}
                  </th>
                ))}
                <th className="rounded-r-2xl px-4 py-3 font-medium">Show</th>
              </tr>
            </thead>
            <tbody>
              {unitTemplate
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((field) => (
                  <tr key={field.key} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 font-medium">{field.key}</td>
                    <td className="px-4 py-3">
                      <input
                        className="h-10 w-full min-w-44 rounded-xl border border-input bg-background px-3"
                        value={field.label}
                        onChange={(event) => updateUnitField(field.key, "label", event.target.value)}
                      />
                    </td>
                    {rtus.map((rtu) => (
                      <td key={`${field.key}-${rtu.rtuKey}`} className="px-4 py-3 font-mono text-foreground/80">
                        {formatMetricValue(latestValuesByRtu[rtu.rtuKey]?.[field.key] ?? null)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={field.visible}
                        onChange={(event) => updateUnitField(field.key, "visible", event.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
