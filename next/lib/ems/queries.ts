import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import {
  mapStoredRtuArray,
  normalizeFieldTemplate,
  normalizeRtuOverrides,
} from "@/lib/ems/service"
import type { EmsFieldTemplateEntry, MappedRtuEntry } from "@/lib/ems/types"

function asNumber(value: { toString(): string } | null | undefined) {
  return value ? Number(value.toString()) : null
}

const UNIT_DETAIL_LOG_LIMIT = 500
const ONLINE_TIMEOUT_MS = 5 * 60 * 1000

function readScalingFactor(unit: Record<string, unknown>) {
  const raw =
    typeof unit.scalingFactor === "number"
      ? unit.scalingFactor
      : typeof unit.scaling_factor === "number"
        ? unit.scaling_factor
        : 1

  return Number.isFinite(raw) ? raw : 1
}

function inferStatus(rawPayload: unknown, lastSeenAt: Date | null) {
  if (!lastSeenAt) {
    return "Unknown"
  }

  const ageMs = Date.now() - lastSeenAt.getTime()
  if (ageMs > ONLINE_TIMEOUT_MS) {
    return "Offline"
  }

  const payloadStatus =
    rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)
      ? (rawPayload as { Status?: unknown }).Status
      : null

  if (typeof payloadStatus === "string") {
    const normalized = payloadStatus.trim().toLowerCase()
    if (normalized === "offline") {
      return "Offline"
    }
    if (normalized === "online") {
      return "Online"
    }
  }

  return "Online"
}

function getFieldTemplateForRtu({
  unitTemplate,
}: {
  unitTemplate: EmsFieldTemplateEntry[]
}) {
  return unitTemplate
}

type UnitWithLogs = Prisma.EmsUnitGetPayload<{
  include: {
    customer: {
      select: {
        customer_id: true
        customer_representative: true
        company: {
          select: {
            name: true
          }
        }
      }
    }
    logs: true
  }
}>

type SummaryRange = "24h" | "7d" | "30d"

type StatSeries = {
  max: number | null
  min: number | null
  avg: number | null
}

type SummaryStats = {
  voltage: StatSeries
  current: StatSeries
  power: StatSeries
  powerFactor: StatSeries
}

type EnergyDailyRange = "3d" | "7d" | "30d"

type EnergyAnalyticsPoint = {
  at: Date
  kwh: number
}

type EnergyAnalytics = {
  monthlyCumulative: Array<{ timestamp: string; label: string; kwh: number }>
  dailyConsumption: Array<{ date: string; label: string; consumption: number }>
  monthlyAverage: Array<{
    month: string
    label: string
    averageConsumption: number
  }>
  hourlyConsumption: Array<{ hour: string; label: string; consumption: number }>
  generatedAt: string
}

function finiteMetric(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function shouldScaleMetricKey(key: string) {
  const normalized = key.trim().toUpperCase()
  if (normalized.startsWith("PF")) {
    return false
  }
  if (normalized === "FREQ" || normalized === "FREQUENCY") {
    return false
  }
  return true
}

function rangeStartDate(range: SummaryRange) {
  const now = Date.now()
  if (range === "24h") {
    return new Date(now - 24 * 60 * 60 * 1000)
  }
  if (range === "7d") {
    return new Date(now - 7 * 24 * 60 * 60 * 1000)
  }
  return new Date(now - 30 * 24 * 60 * 60 * 1000)
}

function stats(values: number[]): StatSeries {
  if (values.length === 0) {
    return { max: null, min: null, avg: null }
  }

  return {
    max: Math.max(...values),
    min: Math.min(...values),
    avg: values.reduce((sum, value) => sum + value, 0) / values.length,
  }
}

function dayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function monthKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

function daysFromRange(range: EnergyDailyRange) {
  if (range === "3d") {
    return 3
  }
  if (range === "7d") {
    return 7
  }
  return 30
}

function buildMonthlyCumulative(points: EnergyAnalyticsPoint[]) {
  if (points.length === 0) {
    return []
  }

  const sorted = points
    .slice()
    .sort((a, b) => a.at.getTime() - b.at.getTime())
  const rows: Array<{ timestamp: string; label: string; kwh: number }> = []
  let cumulative = 0
  let previous = sorted[0]?.kwh ?? 0

  for (let index = 0; index < sorted.length; index += 1) {
    const point = sorted[index]
    if (!point) {
      continue
    }

    if (index > 0) {
      const delta = point.kwh - previous
      if (delta > 0) {
        cumulative += delta
      }
      previous = point.kwh
    }

    rows.push({
      timestamp: point.at.toISOString(),
      label: point.at.toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      kwh: cumulative,
    })
  }

  return rows
}

function buildDailyConsumption(
  points: EnergyAnalyticsPoint[],
  startAt: Date,
  totalDays: number
) {
  const perDay = new Map<string, { min: number; max: number }>()

  for (const point of points) {
    if (point.at.getTime() < startAt.getTime()) {
      continue
    }

    const key = dayKey(point.at)
    const existing = perDay.get(key)
    if (!existing) {
      perDay.set(key, { min: point.kwh, max: point.kwh })
      continue
    }

    if (point.kwh < existing.min) {
      existing.min = point.kwh
    }
    if (point.kwh > existing.max) {
      existing.max = point.kwh
    }
  }

  const rows: Array<{ date: string; label: string; consumption: number }> = []
  for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(startAt)
    date.setDate(startAt.getDate() + (totalDays - 1 - offset))
    const key = dayKey(date)
    const bucket = perDay.get(key)
    const consumption = bucket ? Math.max(bucket.max - bucket.min, 0) : 0

    rows.push({
      date: key,
      label: date.toLocaleDateString([], { day: "2-digit", month: "short" }),
      consumption,
    })
  }

  return rows
}

function buildMonthlyAverage(points: EnergyAnalyticsPoint[], now: Date) {
  const monthStarts = [2, 1, 0].map((back) =>
    new Date(now.getFullYear(), now.getMonth() - back, 1)
  )
  const monthEnd = new Date(now)

  return monthStarts.map((start) => {
    const end =
      start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear()
        ? monthEnd
        : new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)

    const perDay = new Map<string, { min: number; max: number }>()

    for (const point of points) {
      const time = point.at.getTime()
      if (time < start.getTime() || time > end.getTime()) {
        continue
      }

      const key = dayKey(point.at)
      const existing = perDay.get(key)
      if (!existing) {
        perDay.set(key, { min: point.kwh, max: point.kwh })
        continue
      }

      if (point.kwh < existing.min) {
        existing.min = point.kwh
      }
      if (point.kwh > existing.max) {
        existing.max = point.kwh
      }
    }

    const dayConsumptions = Array.from(perDay.values()).map((bucket) =>
      Math.max(bucket.max - bucket.min, 0)
    )
    const averageConsumption =
      dayConsumptions.length > 0
        ? dayConsumptions.reduce((sum, value) => sum + value, 0) /
          dayConsumptions.length
        : 0

    return {
      month: monthKey(start),
      label: start.toLocaleDateString([], { month: "short", year: "numeric" }),
      averageConsumption,
    }
  })
}

function buildHourlyConsumption(points: EnergyAnalyticsPoint[], now: Date) {
  const currentHour = new Date(now)
  currentHour.setMinutes(0, 0, 0)
  const startAt = new Date(currentHour)
  startAt.setHours(startAt.getHours() - 23)

  const hourlySlots = Array.from({ length: 24 }, (_, index) => {
    const hourStart = new Date(startAt)
    hourStart.setHours(startAt.getHours() + index)
    return {
      key: hourStart.getTime(),
      hour: hourStart.toISOString(),
      label: hourStart.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      min: null as number | null,
      max: null as number | null,
    }
  })

  const slotByTime = new Map(hourlySlots.map((slot) => [slot.key, slot]))

  for (const point of points) {
    const time = point.at.getTime()
    if (time < startAt.getTime() || time > now.getTime()) {
      continue
    }

    const slotStart = new Date(point.at)
    slotStart.setMinutes(0, 0, 0)
    const slot = slotByTime.get(slotStart.getTime())
    if (!slot) {
      continue
    }

    if (slot.min == null || point.kwh < slot.min) {
      slot.min = point.kwh
    }
    if (slot.max == null || point.kwh > slot.max) {
      slot.max = point.kwh
    }
  }

  return hourlySlots.map((slot) => ({
    hour: slot.hour,
    label: slot.label,
    consumption:
      slot.min != null && slot.max != null ? Math.max(slot.max - slot.min, 0) : 0,
  }))
}

function formatMappedArray(
  rawRtuArray: unknown,
  unitTemplate: EmsFieldTemplateEntry[],
  overrides: ReturnType<typeof normalizeRtuOverrides>,
  scalingFactor: number = 1
) {
  return mapStoredRtuArray({
    rawRtuArray,
    unitTemplate,
    overrides,
  }).map((entry) => {
    const rtu = entry as MappedRtuEntry
    const rtuKey = rtu.id != null ? String(rtu.id) : (rtu.slave ?? "unknown")
    const fieldTemplate = getFieldTemplateForRtu({ unitTemplate })
    const nickname =
      overrides[rtuKey]?.nickname?.trim() ||
      rtu.nickname ||
      rtu.slave ||
      `RTU-${rtu.id ?? "unknown"}`
    const orderedMetrics = Object.entries(rtu.metrics ?? {})
      .map(([key, value]) => {
        const field = fieldTemplate.find((item) => item.key === key)
        const numericValue =
          typeof value === "number"
            ? shouldScaleMetricKey(key)
              ? value * scalingFactor
              : value
            : value
        return {
          key,
          label: field?.label ?? key,
          order: field?.order ?? Number.MAX_SAFE_INTEGER,
          value: numericValue,
        }
      })
      .sort((a, b) => a.order - b.order)

    return {
      rtuKey,
      id: rtu.id,
      slave: rtu.slave,
      nickname,
      res: rtu.res,
      datalen: rtu.datalen,
      fieldTemplate,
      metrics: orderedMetrics,
    }
  })
}

function formatUnit(unit: UnitWithLogs) {
  const unitTemplate = normalizeFieldTemplate(unit.unit_field_template)
  const overrides = normalizeRtuOverrides(unit.rtu_overrides)
  const scalingFactor = readScalingFactor(
    unit as unknown as Record<string, unknown>
  )
  const latestLog = unit.logs[0] ?? null
  const mappedRtus = latestLog
    ? formatMappedArray(
        latestLog.raw_rtu_array,
        unitTemplate,
        overrides,
        scalingFactor
      )
    : []

  return {
    id: unit.id.toString(),
    unitId: unit.unit_id,
    customerId: unit.customer_id,
    customerName:
      unit.customer?.company.name ??
      unit.customer?.customer_representative ??
      null,
    locationLabel: unit.location_label,
    latitude: asNumber(unit.latitude),
    longitude: asNumber(unit.longitude),
    deviceType: unit.device_type,
    lastSeenAt: unit.last_seen_at?.toISOString() ?? null,
    topicPath: unit.topic_path,
    status: inferStatus(latestLog?.raw_unit_payload, unit.last_seen_at ?? null),
    unitFieldTemplate: unitTemplate,
    rtuOverrides: overrides,
    scalingFactor,
    latestLog: latestLog
      ? {
          id: latestLog.id.toString(),
          deviceTimestamp: latestLog.device_timestamp.toISOString(),
          rawUnitPayload: latestLog.raw_unit_payload,
          mappedRtuArray: mappedRtus,
        }
      : null,
  }
}

export async function getAdminEmsUnits() {
  const units = await prisma.emsUnit.findMany({
    orderBy: [{ last_seen_at: "desc" }, { unit_id: "asc" }],
    include: {
      customer: {
        select: {
          customer_id: true,
          customer_representative: true,
          company: {
            select: {
              name: true,
            },
          },
        },
      },
      logs: {
        orderBy: [{ device_timestamp: "desc" }, { created_at: "desc" }],
        take: 1,
      },
    },
  })

  return units.map(formatUnit)
}

export async function getAdminEmsUnitsFiltered({
  assignment,
  customerId,
}: {
  assignment?: "all" | "assigned" | "unassigned"
  customerId?: number
}) {
  const where: Prisma.EmsUnitWhereInput = {}

  if (assignment === "assigned") {
    where.customer_id = { not: null }
  }

  if (assignment === "unassigned") {
    where.customer_id = null
  }

  if (typeof customerId === "number" && !Number.isNaN(customerId)) {
    where.customer_id = customerId
  }

  const units = await prisma.emsUnit.findMany({
    where,
    orderBy: [{ last_seen_at: "desc" }, { unit_id: "asc" }],
    include: {
      customer: {
        select: {
          customer_id: true,
          customer_representative: true,
          company: {
            select: {
              name: true,
            },
          },
        },
      },
      logs: {
        orderBy: [{ device_timestamp: "desc" }, { created_at: "desc" }],
        take: 1,
      },
    },
  })

  return units.map(formatUnit)
}

export async function getAdminEmsCustomersWithUnits() {
  const grouped = await prisma.emsUnit.groupBy({
    by: ["customer_id"],
    where: {
      customer_id: {
        not: null,
      },
    },
    _count: {
      _all: true,
    },
  })

  const customerIds = grouped
    .map((row) => row.customer_id)
    .filter((value): value is number => value != null)

  if (customerIds.length === 0) {
    return []
  }

  const customers = await prisma.customer.findMany({
    where: {
      customer_id: {
        in: customerIds,
      },
    },
    select: {
      customer_id: true,
      customer_representative: true,
      company: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      customer_id: "asc",
    },
  })

  const counts = new Map(
    grouped
      .filter(
        (row): row is typeof row & { customer_id: number } =>
          row.customer_id != null
      )
      .map((row) => [row.customer_id, row._count._all])
  )

  return customers.map((customer) => ({
    customerId: customer.customer_id,
    companyName: customer.company.name,
    customerName:
      customer.customer_representative ?? `Customer #${customer.customer_id}`,
    unitCount: counts.get(customer.customer_id) ?? 0,
  }))
}

export async function getAdminEmsUnit(unitId: string) {
  const unit = await prisma.emsUnit.findUnique({
    where: { unit_id: unitId },
    include: {
      customer: {
        select: {
          customer_id: true,
          customer_representative: true,
          company: {
            select: {
              name: true,
            },
          },
        },
      },
      logs: {
        orderBy: [{ device_timestamp: "desc" }, { created_at: "desc" }],
        take: UNIT_DETAIL_LOG_LIMIT,
      },
    },
  })

  if (!unit) {
    return null
  }

  const formatted = formatUnit(unit)
  const unitTemplate = normalizeFieldTemplate(unit.unit_field_template)
  const overrides = normalizeRtuOverrides(unit.rtu_overrides)
  const scalingFactor = readScalingFactor(
    unit as unknown as Record<string, unknown>
  )
  const knownRtuMap = new Map<
    string,
    ReturnType<typeof formatMappedArray>[number]
  >()

  for (const log of unit.logs) {
    for (const rtu of formatMappedArray(
      log.raw_rtu_array,
      unitTemplate,
      overrides,
      scalingFactor
    )) {
      if (!knownRtuMap.has(rtu.rtuKey)) {
        knownRtuMap.set(rtu.rtuKey, rtu)
      }
    }
  }

  return {
    ...formatted,
    logs: unit.logs.map((log: (typeof unit.logs)[number]) => ({
      id: log.id.toString(),
      deviceTimestamp: log.device_timestamp.toISOString(),
      status: inferStatus(log.raw_unit_payload, log.device_timestamp),
      rtus: formatMappedArray(
        log.raw_rtu_array,
        unitTemplate,
        overrides,
        scalingFactor
      ),
    })),
    rtus: Array.from(knownRtuMap.values()),
  }
}

export async function getCustomerEmsUnits(customerId: number) {
  const units = await prisma.emsUnit.findMany({
    where: { customer_id: customerId },
    orderBy: [{ last_seen_at: "desc" }, { unit_id: "asc" }],
    include: {
      logs: {
        orderBy: [{ device_timestamp: "desc" }, { created_at: "desc" }],
        take: 1,
      },
    },
  })

  return units.map((unit: (typeof units)[number]) => {
    const unitTemplate = normalizeFieldTemplate(unit.unit_field_template)
    const overrides = normalizeRtuOverrides(unit.rtu_overrides)
    const scalingFactor = readScalingFactor(
      unit as unknown as Record<string, unknown>
    )
    const latestLog = unit.logs[0] ?? null
    const mappedRtus = latestLog
      ? formatMappedArray(
          latestLog.raw_rtu_array,
          unitTemplate,
          overrides,
          scalingFactor
        )
      : []

    return {
      id: unit.id.toString(),
      unitId: unit.unit_id,
      status: inferStatus(
        latestLog?.raw_unit_payload,
        unit.last_seen_at ?? null
      ),
      locationLabel: unit.location_label,
      latitude: asNumber(unit.latitude),
      longitude: asNumber(unit.longitude),
      deviceType: unit.device_type,
      lastSeenAt: unit.last_seen_at?.toISOString() ?? null,
      slaveCount: mappedRtus.length,
    }
  })
}

export async function getCustomerEmsUnitDetail({
  customerId,
  unitId,
}: {
  customerId: number
  unitId: string
}) {
  const unit = await prisma.emsUnit.findFirst({
    where: {
      unit_id: unitId,
      customer_id: customerId,
    },
    include: {
      logs: {
        orderBy: [{ device_timestamp: "desc" }, { created_at: "desc" }],
        take: UNIT_DETAIL_LOG_LIMIT,
      },
    },
  })

  if (!unit) {
    return null
  }

  const unitTemplate = normalizeFieldTemplate(unit.unit_field_template)
  const overrides = normalizeRtuOverrides(unit.rtu_overrides)
  const scalingFactor = readScalingFactor(
    unit as unknown as Record<string, unknown>
  )
  const latestLog = unit.logs[0] ?? null

  return {
    id: unit.id.toString(),
    unitId: unit.unit_id,
    status: inferStatus(latestLog?.raw_unit_payload, unit.last_seen_at ?? null),
    locationLabel: unit.location_label,
    latitude: asNumber(unit.latitude),
    longitude: asNumber(unit.longitude),
    deviceType: unit.device_type,
    lastSeenAt: unit.last_seen_at?.toISOString() ?? null,
    latestRtus: latestLog
      ? formatMappedArray(
          latestLog.raw_rtu_array,
          unitTemplate,
          overrides,
          scalingFactor
        )
      : [],
    logs: unit.logs.map((log: (typeof unit.logs)[number]) => ({
      id: log.id.toString(),
      deviceTimestamp: log.device_timestamp.toISOString(),
      status: inferStatus(log.raw_unit_payload, log.device_timestamp),
      rtus: formatMappedArray(
        log.raw_rtu_array,
        unitTemplate,
        overrides,
        scalingFactor
      ),
    })),
  }
}

export async function getCustomerEmsSummaryStats({
  customerId,
  unitId,
  rtuKey,
  range,
}: {
  customerId: number
  unitId: string
  rtuKey: string
  range: SummaryRange
}): Promise<SummaryStats | null> {
  const unit = await prisma.emsUnit.findFirst({
    where: {
      unit_id: unitId,
      customer_id: customerId,
    },
    select: {
      id: true,
      unit_field_template: true,
      rtu_overrides: true,
      scalingFactor: true,
    },
  })

  if (!unit) {
    return null
  }

  const unitTemplate = normalizeFieldTemplate(unit.unit_field_template)
  const overrides = normalizeRtuOverrides(unit.rtu_overrides)
  const scalingFactor = readScalingFactor(
    unit as unknown as Record<string, unknown>
  )
  const startAt = rangeStartDate(range)

  const logs = await prisma.emsLog.findMany({
    where: {
      ems_unit_id: unit.id,
      device_timestamp: {
        gte: startAt,
      },
    },
    orderBy: [{ device_timestamp: "asc" }, { created_at: "asc" }],
    select: {
      raw_rtu_array: true,
    },
  })

  const voltageRows: number[] = []
  const currentRows: number[] = []
  const powerRows: number[] = []
  const powerFactorRows: number[] = []

  for (const log of logs) {
    const mappedRtus = formatMappedArray(
      log.raw_rtu_array,
      unitTemplate,
      overrides,
      scalingFactor
    )
    const rtu = mappedRtus.find((entry) => entry.rtuKey === rtuKey)
    if (!rtu) {
      continue
    }

    const metricMap = new Map(
      rtu.metrics.map((metric) => [metric.key, finiteMetric(metric.value)])
    )

    const vry = metricMap.get("VRY")
    const vyb = metricMap.get("VYB")
    const vbr = metricMap.get("VBR")
    const ir = metricMap.get("IR")
    const iy = metricMap.get("IY")
    const ib = metricMap.get("IB")
    const kwr = metricMap.get("KW-R")
    const kwy = metricMap.get("KW-Y")
    const kwb = metricMap.get("KW-B")
    const pfr = metricMap.get("PF-R")
    const pfy = metricMap.get("PF-Y")
    const pfb = metricMap.get("PF-B")

    const voltageValues = [vry, vyb, vbr].filter(
      (value): value is number => value != null
    )
    if (voltageValues.length > 0) {
      voltageRows.push(
        voltageValues.reduce((sum, value) => sum + value, 0) /
          voltageValues.length
      )
    }

    const currentValues = [ir, iy, ib].filter(
      (value): value is number => value != null
    )
    if (currentValues.length > 0) {
      currentRows.push(
        currentValues.reduce((sum, value) => sum + value, 0) /
          currentValues.length
      )
    }

    if (kwr != null && kwy != null && kwb != null) {
      powerRows.push(kwr + kwy + kwb)
    }

    const powerFactorValues = [pfr, pfy, pfb].filter(
      (value): value is number => value != null && value >= 0 && value <= 1
    )
    if (powerFactorValues.length > 0) {
      powerFactorRows.push(
        powerFactorValues.reduce((sum, value) => sum + value, 0) /
          powerFactorValues.length
      )
    }
  }

  return {
    voltage: stats(voltageRows),
    current: stats(currentRows),
    power: stats(powerRows),
    powerFactor: stats(powerFactorRows),
  }
}

export async function getCustomerEmsCurrentHourlyStats({
  customerId,
  unitId,
  rtuKey,
}: {
  customerId: number
  unitId: string
  rtuKey: string
}) {
  const unit = await prisma.emsUnit.findFirst({
    where: {
      unit_id: unitId,
      customer_id: customerId,
    },
    select: {
      id: true,
      unit_field_template: true,
      rtu_overrides: true,
      scalingFactor: true,
    },
  })

  if (!unit) {
    return null
  }

  const unitTemplate = normalizeFieldTemplate(unit.unit_field_template)
  const overrides = normalizeRtuOverrides(unit.rtu_overrides)
  const scalingFactor = readScalingFactor(
    unit as unknown as Record<string, unknown>
  )

  const now = new Date()
  const currentHour = new Date(now)
  currentHour.setMinutes(0, 0, 0)
  const startAt = new Date(currentHour)
  startAt.setHours(startAt.getHours() - 23)

  const logs = await prisma.emsLog.findMany({
    where: {
      ems_unit_id: unit.id,
      device_timestamp: {
        gte: startAt,
      },
    },
    orderBy: [{ device_timestamp: "asc" }, { created_at: "asc" }],
    select: {
      device_timestamp: true,
      raw_rtu_array: true,
    },
  })

  const hourlySlots = Array.from({ length: 24 }, (_, index) => {
    const hourStart = new Date(startAt)
    hourStart.setHours(startAt.getHours() + index)
    return {
      key: hourStart.getTime(),
      timestamp: hourStart.toISOString(),
      hour: hourStart.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      values: [] as number[],
    }
  })

  const slotByTime = new Map(hourlySlots.map((slot) => [slot.key, slot]))

  for (const log of logs) {
    const mappedRtus = formatMappedArray(
      log.raw_rtu_array,
      unitTemplate,
      overrides,
      scalingFactor
    )

    const rtu = mappedRtus.find((entry) => entry.rtuKey === rtuKey)
    if (!rtu) {
      continue
    }

    const metricMap = new Map(
      rtu.metrics.map((metric) => [metric.key, finiteMetric(metric.value)])
    )
    const ir = metricMap.get("IR")
    const iy = metricMap.get("IY")
    const ib = metricMap.get("IB")
    const available = [ir, iy, ib].filter(
      (value): value is number => value != null
    )

    if (available.length === 0) {
      continue
    }

    const hourStart = new Date(log.device_timestamp)
    hourStart.setMinutes(0, 0, 0)
    const slot = slotByTime.get(hourStart.getTime())

    if (!slot) {
      continue
    }

    const averageCurrent =
      available.reduce((sum, value) => sum + value, 0) / available.length
    slot.values.push(averageCurrent)
  }

  return {
    points: hourlySlots.map((slot) => ({
      timestamp: slot.timestamp,
      hour: slot.hour,
      averageCurrent:
        slot.values.length > 0
          ? slot.values.reduce((sum, value) => sum + value, 0) /
            slot.values.length
          : null,
    })),
    computedAt: new Date().toISOString(),
  }
}

export async function getCustomerEmsVoltageHourlyStats({
  customerId,
  unitId,
  rtuKey,
}: {
  customerId: number
  unitId: string
  rtuKey: string
}) {
  const unit = await prisma.emsUnit.findFirst({
    where: {
      unit_id: unitId,
      customer_id: customerId,
    },
    select: {
      id: true,
      unit_field_template: true,
      rtu_overrides: true,
      scalingFactor: true,
    },
  })

  if (!unit) {
    return null
  }

  const unitTemplate = normalizeFieldTemplate(unit.unit_field_template)
  const overrides = normalizeRtuOverrides(unit.rtu_overrides)
  const scalingFactor = readScalingFactor(
    unit as unknown as Record<string, unknown>
  )

  const now = new Date()
  const currentHour = new Date(now)
  currentHour.setMinutes(0, 0, 0)
  const startAt = new Date(currentHour)
  startAt.setHours(startAt.getHours() - 11)

  const logs = await prisma.emsLog.findMany({
    where: {
      ems_unit_id: unit.id,
      device_timestamp: {
        gte: startAt,
      },
    },
    orderBy: [{ device_timestamp: "asc" }, { created_at: "asc" }],
    select: {
      device_timestamp: true,
      raw_rtu_array: true,
    },
  })

  const hourlySlots = Array.from({ length: 12 }, (_, index) => {
    const hourStart = new Date(startAt)
    hourStart.setHours(startAt.getHours() + index)
    return {
      key: hourStart.getTime(),
      timestamp: hourStart.toISOString(),
      hour: hourStart.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      llValues: [] as number[],
      lnValues: [] as number[],
    }
  })

  const slotByTime = new Map(hourlySlots.map((slot) => [slot.key, slot]))

  for (const log of logs) {
    const mappedRtus = formatMappedArray(
      log.raw_rtu_array,
      unitTemplate,
      overrides,
      scalingFactor
    )

    const rtu = mappedRtus.find((entry) => entry.rtuKey === rtuKey)
    if (!rtu) {
      continue
    }

    const metricMap = new Map(
      rtu.metrics.map((metric) => [metric.key, finiteMetric(metric.value)])
    )
    const vry = metricMap.get("VRY")
    const vyb = metricMap.get("VYB")
    const vbr = metricMap.get("VBR")
    const vrn = metricMap.get("VRN")
    const vyn = metricMap.get("VYN")
    const vbn = metricMap.get("VBN")

    const llValues = [vry, vyb, vbr].filter(
      (value): value is number => value != null
    )
    const lnValues = [vrn, vyn, vbn].filter(
      (value): value is number => value != null
    )

    if (llValues.length === 0 && lnValues.length === 0) {
      continue
    }

    const hourStart = new Date(log.device_timestamp)
    hourStart.setMinutes(0, 0, 0)
    const slot = slotByTime.get(hourStart.getTime())

    if (!slot) {
      continue
    }

    if (llValues.length > 0) {
      slot.llValues.push(
        llValues.reduce((sum, value) => sum + value, 0) / llValues.length
      )
    }

    if (lnValues.length > 0) {
      slot.lnValues.push(
        lnValues.reduce((sum, value) => sum + value, 0) / lnValues.length
      )
    }
  }

  return {
    points: hourlySlots.map((slot) => ({
      timestamp: slot.timestamp,
      hour: slot.hour,
      averageVoltageLL:
        slot.llValues.length > 0
          ? slot.llValues.reduce((sum, value) => sum + value, 0) /
            slot.llValues.length
          : null,
      averageVoltageLN:
        slot.lnValues.length > 0
          ? slot.lnValues.reduce((sum, value) => sum + value, 0) /
            slot.lnValues.length
          : null,
    })),
    computedAt: new Date().toISOString(),
  }
}

export async function getCustomerEmsEnergyAnalytics({
  customerId,
  unitId,
  rtuKey,
  dailyRange,
}: {
  customerId: number
  unitId: string
  rtuKey: string
  dailyRange: EnergyDailyRange
}): Promise<EnergyAnalytics | null> {
  const unit = await prisma.emsUnit.findFirst({
    where: {
      unit_id: unitId,
      customer_id: customerId,
    },
    select: {
      id: true,
      unit_field_template: true,
      rtu_overrides: true,
      scalingFactor: true,
    },
  })

  if (!unit) {
    return null
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const totalDays = daysFromRange(dailyRange)
  const dailyStart = new Date(now)
  dailyStart.setHours(0, 0, 0, 0)
  dailyStart.setDate(dailyStart.getDate() - (totalDays - 1))
  const threeMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  const earliestStart = new Date(
    Math.min(monthStart.getTime(), dailyStart.getTime(), threeMonthStart.getTime())
  )

  const unitTemplate = normalizeFieldTemplate(unit.unit_field_template)
  const overrides = normalizeRtuOverrides(unit.rtu_overrides)
  const scalingFactor = readScalingFactor(
    unit as unknown as Record<string, unknown>
  )

  const logs = await prisma.emsLog.findMany({
    where: {
      ems_unit_id: unit.id,
      device_timestamp: {
        gte: earliestStart,
      },
    },
    orderBy: [{ device_timestamp: "asc" }, { created_at: "asc" }],
    select: {
      device_timestamp: true,
      raw_rtu_array: true,
    },
  })

  const readings: EnergyAnalyticsPoint[] = []
  for (const log of logs) {
    const mappedRtus = formatMappedArray(
      log.raw_rtu_array,
      unitTemplate,
      overrides,
      scalingFactor
    )
    const rtu = mappedRtus.find((entry) => entry.rtuKey === rtuKey)
    if (!rtu) {
      continue
    }

    const kwh = finiteMetric(
      rtu.metrics.find((metric) => metric.key === "Kwh")?.value
    )
    if (kwh == null) {
      continue
    }

    readings.push({ at: new Date(log.device_timestamp), kwh })
  }

  const monthlyReadings = readings.filter(
    (point) => point.at.getTime() >= monthStart.getTime()
  )

  return {
    monthlyCumulative: buildMonthlyCumulative(monthlyReadings),
    dailyConsumption: buildDailyConsumption(readings, dailyStart, totalDays),
    monthlyAverage: buildMonthlyAverage(readings, now),
    hourlyConsumption: buildHourlyConsumption(readings, now),
    generatedAt: new Date().toISOString(),
  }
}

type EmsLogsRange = {
  startAt?: Date
  endAt?: Date
}

function buildDeviceTimestampFilter({ startAt, endAt }: EmsLogsRange) {
  if (!startAt && !endAt) {
    return undefined
  }

  return {
    ...(startAt ? { gte: startAt } : {}),
    ...(endAt ? { lte: endAt } : {}),
  }
}

async function getCustomerUnitForLogs({
  customerId,
  unitId,
}: {
  customerId: number
  unitId: string
}) {
  return prisma.emsUnit.findFirst({
    where: {
      unit_id: unitId,
      customer_id: customerId,
    },
    select: {
      id: true,
      unit_id: true,
      unit_field_template: true,
      rtu_overrides: true,
      scalingFactor: true,
    },
  })
}

export type CustomerEmsLogsPage = {
  logs: Array<{
    id: string
    deviceTimestamp: string
    status: string
    rtus: ReturnType<typeof formatMappedArray>
  }>
  nextCursor: string | null
  hasMore: boolean
}

export async function getCustomerEmsLogsPage({
  customerId,
  unitId,
  cursor,
  limit,
}: {
  customerId: number
  unitId: string
  cursor?: string | null
  limit: number
}): Promise<CustomerEmsLogsPage | null> {
  const unit = await getCustomerUnitForLogs({ customerId, unitId })
  if (!unit) {
    return null
  }

  const normalizedLimit = Math.min(Math.max(Math.floor(limit), 1), 200)
  let cursorId: bigint | null = null
  if (cursor) {
    try {
      cursorId = BigInt(cursor)
    } catch {
      throw new Error("Invalid logs cursor")
    }
  }

  const unitTemplate = normalizeFieldTemplate(unit.unit_field_template)
  const overrides = normalizeRtuOverrides(unit.rtu_overrides)
  const scalingFactor = readScalingFactor(
    unit as unknown as Record<string, unknown>
  )

  const rows = await prisma.emsLog.findMany({
    where: {
      ems_unit_id: unit.id,
      ...(cursorId ? { id: { lt: cursorId } } : {}),
    },
    orderBy: [{ id: "desc" }],
    take: normalizedLimit + 1,
    select: {
      id: true,
      device_timestamp: true,
      raw_unit_payload: true,
      raw_rtu_array: true,
    },
  })

  const hasMore = rows.length > normalizedLimit
  const pageRows = hasMore ? rows.slice(0, normalizedLimit) : rows
  const logs = pageRows.map((log) => ({
    id: log.id.toString(),
    deviceTimestamp: log.device_timestamp.toISOString(),
    status: inferStatus(log.raw_unit_payload, log.device_timestamp),
    rtus: formatMappedArray(
      log.raw_rtu_array,
      unitTemplate,
      overrides,
      scalingFactor
    ),
  }))

  return {
    logs,
    nextCursor:
      hasMore && pageRows.length > 0
        ? pageRows[pageRows.length - 1]?.id.toString() ?? null
        : null,
    hasMore,
  }
}

export type CustomerRawCsvRow = {
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

function metricFromMap(map: Map<string, number | null>, key: string) {
  const value = map.get(key)
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function mapRawCsvRow({
  log,
  unitTemplate,
  overrides,
  scalingFactor,
  rtuKey,
}: {
  log: {
    device_timestamp: Date
    raw_rtu_array: Prisma.JsonValue
  }
  unitTemplate: EmsFieldTemplateEntry[]
  overrides: ReturnType<typeof normalizeRtuOverrides>
  scalingFactor: number
  rtuKey: string
}) {
  const mappedRtus = formatMappedArray(
    log.raw_rtu_array,
    unitTemplate,
    overrides,
    scalingFactor
  )
  const rtu = mappedRtus.find((entry) => entry.rtuKey === rtuKey)
  if (!rtu) {
    return null
  }

  const metricMap = new Map(
    rtu.metrics.map((metric) => [metric.key, finiteMetric(metric.value)])
  )

  return {
    timestamp: log.device_timestamp.toISOString(),
    kwh: metricFromMap(metricMap, "Kwh"),
    kvah: metricFromMap(metricMap, "KvAh"),
    kvarh: metricFromMap(metricMap, "KvArh"),
    voltageRn: metricFromMap(metricMap, "VRN"),
    voltageYn: metricFromMap(metricMap, "VYN"),
    voltageBn: metricFromMap(metricMap, "VBN"),
    voltageRy: metricFromMap(metricMap, "VRY"),
    voltageYb: metricFromMap(metricMap, "VYB"),
    voltageBr: metricFromMap(metricMap, "VBR"),
    currentR: metricFromMap(metricMap, "IR"),
    currentY: metricFromMap(metricMap, "IY"),
    currentB: metricFromMap(metricMap, "IB"),
    kwR: metricFromMap(metricMap, "KW-R"),
    kwY: metricFromMap(metricMap, "KW-Y"),
    kwB: metricFromMap(metricMap, "KW-B"),
    pfR: metricFromMap(metricMap, "PF-R"),
    pfY: metricFromMap(metricMap, "PF-Y"),
    pfB: metricFromMap(metricMap, "PF-B"),
    frequency: metricFromMap(metricMap, "Freq"),
  } satisfies CustomerRawCsvRow
}

async function getCustomerRawRowsIteratorContext({
  customerId,
  unitId,
}: {
  customerId: number
  unitId: string
}) {
  const unit = await getCustomerUnitForLogs({ customerId, unitId })
  if (!unit) {
    return null
  }

  return {
    unit,
    unitTemplate: normalizeFieldTemplate(unit.unit_field_template),
    overrides: normalizeRtuOverrides(unit.rtu_overrides),
    scalingFactor: readScalingFactor(unit as unknown as Record<string, unknown>),
  }
}

export async function countCustomerEmsRawRows({
  customerId,
  unitId,
  rtuKey,
  startAt,
  endAt,
  batchSize = 2_000,
}: {
  customerId: number
  unitId: string
  rtuKey: string
  startAt?: Date
  endAt?: Date
  batchSize?: number
}): Promise<number | null> {
  const context = await getCustomerRawRowsIteratorContext({ customerId, unitId })
  if (!context) {
    return null
  }

  const safeBatchSize = Math.min(Math.max(Math.floor(batchSize), 100), 10_000)
  const deviceTimestampFilter = buildDeviceTimestampFilter({ startAt, endAt })
  let cursorId: bigint | null = null
  let count = 0

  while (true) {
    const whereClause: Record<string, unknown> = {
      ems_unit_id: context.unit.id,
      ...(deviceTimestampFilter
        ? { device_timestamp: deviceTimestampFilter }
        : {}),
      ...(cursorId ? { id: { gt: cursorId } } : {}),
    }

    const rows = await prisma.emsLog.findMany({
      where: whereClause,
      orderBy: [{ id: "asc" }],
      take: safeBatchSize,
      select: {
        id: true,
        device_timestamp: true,
        raw_rtu_array: true,
      },
    })

    if (rows.length === 0) {
      break
    }

    for (const log of rows) {
      const row = mapRawCsvRow({
        log,
        unitTemplate: context.unitTemplate,
        overrides: context.overrides,
        scalingFactor: context.scalingFactor,
        rtuKey,
      })
      if (row) {
        count += 1
      }
    }

    cursorId = rows[rows.length - 1]?.id ?? null
    if (rows.length < safeBatchSize) {
      break
    }
  }

  return count
}

export async function* streamCustomerRawRows({
  customerId,
  unitId,
  rtuKey,
  startAt,
  endAt,
  batchSize = 2_000,
}: {
  customerId: number
  unitId: string
  rtuKey: string
  startAt?: Date
  endAt?: Date
  batchSize?: number
}): AsyncGenerator<CustomerRawCsvRow, void, void> {
  const context = await getCustomerRawRowsIteratorContext({ customerId, unitId })
  if (!context) {
    return
  }

  const safeBatchSize = Math.min(Math.max(Math.floor(batchSize), 100), 10_000)
  const deviceTimestampFilter = buildDeviceTimestampFilter({ startAt, endAt })
  let cursorId: bigint | null = null

  while (true) {
    const whereClause: Record<string, unknown> = {
      ems_unit_id: context.unit.id,
      ...(deviceTimestampFilter
        ? { device_timestamp: deviceTimestampFilter }
        : {}),
      ...(cursorId ? { id: { gt: cursorId } } : {}),
    }

    const rows = await prisma.emsLog.findMany({
      where: whereClause,
      orderBy: [{ id: "asc" }],
      take: safeBatchSize,
      select: {
        id: true,
        device_timestamp: true,
        raw_rtu_array: true,
      },
    })

    if (rows.length === 0) {
      break
    }

    for (const log of rows) {
      const row = mapRawCsvRow({
        log,
        unitTemplate: context.unitTemplate,
        overrides: context.overrides,
        scalingFactor: context.scalingFactor,
        rtuKey,
      })
      if (row) {
        yield row
      }
    }

    cursorId = rows[rows.length - 1]?.id ?? null
    if (rows.length < safeBatchSize) {
      break
    }
  }
}
