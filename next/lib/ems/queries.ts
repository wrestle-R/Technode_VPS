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
    if (normalized === "online") {
      return "Online"
    }
    if (normalized === "offline") {
      return "Offline"
    }
  }

  return "Offline"
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

function finiteMetric(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
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
        return {
          key,
          label: field?.label ?? key,
          order: field?.order ?? Number.MAX_SAFE_INTEGER,
          value: typeof value === "number" ? value * scalingFactor : value,
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
