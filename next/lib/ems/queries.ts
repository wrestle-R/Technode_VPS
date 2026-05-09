import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

function asNumber(value: { toString(): string } | null | undefined) {
  return value ? Number(value.toString()) : null
}

const UNIT_DETAIL_LOG_LIMIT = 500
const UNIT_LIST_STATUS_LOOKBACK = 20
const DATA_FRESH_TIMEOUT_MS = 2 * 60 * 1000

type SummaryRange = "24h" | "7d" | "30d"
type EnergyDailyRange = "3d" | "7d" | "30d"

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

type MetricValue = {
  key: string
  label: string
  order: number
  value: number | null
}

type MeterEntry = {
  meterKey: string
  name: string
  metrics: MetricValue[]
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

type EnergyAnalyticsPoint = {
  at: Date
  kwh: number
}

type EnergyAnalytics = {
  monthlyCumulative: Array<{ timestamp: string; label: string; kwh: number }>
  dailyConsumption: Array<{ date: string; label: string; consumption: number }>
  monthlyAverage: Array<{ month: string; label: string; averageConsumption: number }>
  hourlyConsumption: Array<{ hour: string; label: string; consumption: number }>
  generatedAt: string
}

type JsonObject = Record<string, unknown>

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function finiteMetric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function meterEntriesFromPayload(raw: unknown): MeterEntry[] {
  if (!isPlainObject(raw)) {
    return []
  }

  const entries = Object.entries(raw)
    .filter(([, value]) => isPlainObject(value))
    .sort(([a], [b]) => {
      const aNum = Number(a)
      const bNum = Number(b)
      const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum)
      if (bothNumeric) {
        return aNum - bNum
      }
      return a.localeCompare(b)
    })

  return entries.map(([meterKey, meterPayload]) => {
    const payload = meterPayload as JsonObject
    const metrics = Object.entries(payload)
      .filter(([key]) => key !== "name")
      .map(([key, value], index) => ({
        key,
        label: key,
        order: index,
        value: finiteMetric(value),
      }))

    const meterName =
      typeof payload.name === "string" && payload.name.trim()
        ? payload.name.trim()
        : `Meter ${meterKey}`

    return {
      meterKey,
      name: meterName,
      metrics,
    }
  })
}

function findMeter(meters: MeterEntry[], meterKey: string) {
  return meters.find((meter) => meter.meterKey === meterKey) ?? null
}

function meterMetricValue(meter: MeterEntry | null, key: string) {
  if (!meter) {
    return null
  }
  return meter.metrics.find((metric) => metric.key === key)?.value ?? null
}

function normalizeStatus(raw: string | null | undefined) {
  if (!raw) {
    return null
  }

  const normalized = raw.trim().toLowerCase()
  if (normalized === "online" || normalized === "offline") {
    return normalized
  }

  return null
}

function isFresh(timestamp: Date | null | undefined) {
  if (!timestamp) {
    return false
  }

  return Date.now() - timestamp.getTime() <= DATA_FRESH_TIMEOUT_MS
}

function inferUnitStatus(unit: {
  last_status: string | null
  last_seen_at: Date | null
}) {
  const normalized = normalizeStatus(unit.last_status)
  if (normalized === "offline") {
    return "Offline"
  }

  if (normalized === "online" && isFresh(unit.last_seen_at)) {
    return "Online"
  }

  if (isFresh(unit.last_seen_at)) {
    return "Online"
  }

  return "Offline"
}

function inferLogStatus(statusValue: string | null, rawPayload: unknown) {
  const fromStatus = normalizeStatus(statusValue)
  if (fromStatus === "online") {
    return "Online"
  }
  if (fromStatus === "offline") {
    return "Offline"
  }

  if (isPlainObject(rawPayload)) {
    const rawStatus = normalizeStatus(
      typeof rawPayload.Status === "string" ? rawPayload.Status : null
    )
    if (rawStatus === "online") {
      return "Online"
    }
    if (rawStatus === "offline") {
      return "Offline"
    }
  }

  return "Unknown"
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

  const sorted = points.slice().sort((a, b) => a.at.getTime() - b.at.getTime())
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
        ? dayConsumptions.reduce((sum, value) => sum + value, 0) / dayConsumptions.length
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
      label: hourStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
    consumption: slot.min != null && slot.max != null ? Math.max(slot.max - slot.min, 0) : 0,
  }))
}

function formatUnit(unit: UnitWithLogs) {
  const latestDataLog = unit.logs.find((log) => log.message_type === "data") ?? null
  const latestMeters = latestDataLog ? meterEntriesFromPayload(latestDataLog.meter_payload) : []

  return {
    id: unit.id.toString(),
    unitId: unit.unit_id,
    customerId: unit.customer_id,
    customerName:
      unit.customer?.company.name ?? unit.customer?.customer_representative ?? null,
    locationLabel: unit.location_label,
    latitude: asNumber(unit.latitude),
    longitude: asNumber(unit.longitude),
    deviceType: unit.device_type,
    lastSeenAt: unit.last_seen_at?.toISOString() ?? null,
    topicPath: unit.topic_path,
    status: inferUnitStatus(unit),
    latestLog: latestDataLog
      ? {
          id: latestDataLog.id.toString(),
          deviceTimestamp: latestDataLog.device_timestamp.toISOString(),
          rawPayload: latestDataLog.raw_payload,
          meterArray: latestMeters,
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
          company: { select: { name: true } },
        },
      },
      logs: {
        where: { message_type: "data" },
        orderBy: [{ device_timestamp: "desc" }, { created_at: "desc" }],
        take: UNIT_LIST_STATUS_LOOKBACK,
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
          company: { select: { name: true } },
        },
      },
      logs: {
        where: { message_type: "data" },
        orderBy: [{ device_timestamp: "desc" }, { created_at: "desc" }],
        take: UNIT_LIST_STATUS_LOOKBACK,
      },
    },
  })

  return units.map(formatUnit)
}

export async function getAdminEmsCustomersWithUnits() {
  const grouped = await prisma.emsUnit.groupBy({
    by: ["customer_id"],
    where: { customer_id: { not: null } },
    _count: { _all: true },
  })

  const customerIds = grouped
    .map((row) => row.customer_id)
    .filter((value): value is number => value != null)

  if (customerIds.length === 0) {
    return []
  }

  const customers = await prisma.customer.findMany({
    where: { customer_id: { in: customerIds } },
    select: {
      customer_id: true,
      customer_representative: true,
      company: { select: { name: true } },
    },
    orderBy: { customer_id: "asc" },
  })

  const counts = new Map(
    grouped
      .filter(
        (row): row is typeof row & { customer_id: number } => row.customer_id != null
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
          company: { select: { name: true } },
        },
      },
      logs: {
        where: { message_type: "data" },
        orderBy: [{ device_timestamp: "desc" }, { created_at: "desc" }],
        take: UNIT_DETAIL_LOG_LIMIT,
      },
    },
  })

  if (!unit) {
    return null
  }

  const formatted = formatUnit(unit)
  const knownMeterMap = new Map<string, MeterEntry>()

  for (const log of unit.logs) {
    for (const meter of meterEntriesFromPayload(log.meter_payload)) {
      if (!knownMeterMap.has(meter.meterKey)) {
        knownMeterMap.set(meter.meterKey, meter)
      }
    }
  }

  return {
    ...formatted,
    logs: unit.logs.map((log) => ({
      id: log.id.toString(),
      deviceTimestamp: log.device_timestamp.toISOString(),
      status: inferLogStatus(log.status_value, log.raw_payload),
      meters: meterEntriesFromPayload(log.meter_payload),
    })),
    meters: Array.from(knownMeterMap.values()),
  }
}

export async function getCustomerEmsUnits(customerId: number) {
  const units = await prisma.emsUnit.findMany({
    where: { customer_id: customerId },
    orderBy: [{ last_seen_at: "desc" }, { unit_id: "asc" }],
    include: {
      logs: {
        where: { message_type: "data" },
        orderBy: [{ device_timestamp: "desc" }, { created_at: "desc" }],
        take: 1,
      },
    },
  })

  return units.map((unit) => {
    const latestMeters = meterEntriesFromPayload(unit.logs[0]?.meter_payload)

    return {
      id: unit.id.toString(),
      unitId: unit.unit_id,
      status: inferUnitStatus(unit),
      locationLabel: unit.location_label,
      latitude: asNumber(unit.latitude),
      longitude: asNumber(unit.longitude),
      deviceType: unit.device_type,
      lastSeenAt: unit.last_seen_at?.toISOString() ?? null,
      meterCount: latestMeters.length,
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
    where: { unit_id: unitId, customer_id: customerId },
    include: {
      logs: {
        where: { message_type: "data" },
        orderBy: [{ device_timestamp: "desc" }, { created_at: "desc" }],
        take: UNIT_DETAIL_LOG_LIMIT,
      },
    },
  })

  if (!unit) {
    return null
  }

  const latestDataLog = unit.logs[0] ?? null

  return {
    id: unit.id.toString(),
    unitId: unit.unit_id,
    status: inferUnitStatus(unit),
    locationLabel: unit.location_label,
    latitude: asNumber(unit.latitude),
    longitude: asNumber(unit.longitude),
    deviceType: unit.device_type,
    lastSeenAt: unit.last_seen_at?.toISOString() ?? null,
    latestMeters: latestDataLog ? meterEntriesFromPayload(latestDataLog.meter_payload) : [],
    logs: unit.logs.map((log) => ({
      id: log.id.toString(),
      deviceTimestamp: log.device_timestamp.toISOString(),
      status: inferLogStatus(log.status_value, log.raw_payload),
      meters: meterEntriesFromPayload(log.meter_payload),
    })),
  }
}

async function getCustomerDataLogs({
  customerId,
  unitId,
  startAt,
}: {
  customerId: number
  unitId: string
  startAt?: Date
}) {
  const unit = await prisma.emsUnit.findFirst({
    where: { unit_id: unitId, customer_id: customerId },
    select: { id: true },
  })

  if (!unit) {
    return null
  }

  const logs = await prisma.emsLog.findMany({
    where: {
      ems_unit_id: unit.id,
      message_type: "data",
      ...(startAt ? { device_timestamp: { gte: startAt } } : {}),
    },
    orderBy: [{ device_timestamp: "asc" }, { created_at: "asc" }],
    select: {
      id: true,
      device_timestamp: true,
      meter_payload: true,
      raw_payload: true,
      status_value: true,
    },
  })

  return { unitId: unit.id, logs }
}

export async function getCustomerEmsSummaryStats({
  customerId,
  unitId,
  meterKey,
  range,
}: {
  customerId: number
  unitId: string
  meterKey: string
  range: SummaryRange
}): Promise<SummaryStats | null> {
  const data = await getCustomerDataLogs({
    customerId,
    unitId,
    startAt: rangeStartDate(range),
  })

  if (!data) {
    return null
  }

  const voltageRows: number[] = []
  const currentRows: number[] = []
  const powerRows: number[] = []
  const powerFactorRows: number[] = []

  for (const log of data.logs) {
    const meter = findMeter(meterEntriesFromPayload(log.meter_payload), meterKey)
    if (!meter) {
      continue
    }

    const vry = meterMetricValue(meter, "VRY")
    const vyb = meterMetricValue(meter, "VYB")
    const vbr = meterMetricValue(meter, "VBR")
    const ir = meterMetricValue(meter, "IR")
    const iy = meterMetricValue(meter, "IY")
    const ib = meterMetricValue(meter, "IB")
    const kwr = meterMetricValue(meter, "KW-R")
    const kwy = meterMetricValue(meter, "KW-Y")
    const kwb = meterMetricValue(meter, "KW-B")
    const pfr = meterMetricValue(meter, "PF-R")
    const pfy = meterMetricValue(meter, "PF-Y")
    const pfb = meterMetricValue(meter, "PF-B")

    const voltageValues = [vry, vyb, vbr].filter((value): value is number => value != null)
    if (voltageValues.length > 0) {
      voltageRows.push(voltageValues.reduce((sum, value) => sum + value, 0) / voltageValues.length)
    }

    const currentValues = [ir, iy, ib].filter((value): value is number => value != null)
    if (currentValues.length > 0) {
      currentRows.push(currentValues.reduce((sum, value) => sum + value, 0) / currentValues.length)
    }

    if (kwr != null && kwy != null && kwb != null) {
      powerRows.push(kwr + kwy + kwb)
    }

    const powerFactorValues = [pfr, pfy, pfb].filter(
      (value): value is number => value != null && value >= 0 && value <= 1
    )
    if (powerFactorValues.length > 0) {
      powerFactorRows.push(
        powerFactorValues.reduce((sum, value) => sum + value, 0) / powerFactorValues.length
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
  meterKey,
}: {
  customerId: number
  unitId: string
  meterKey: string
}) {
  const now = new Date()
  const currentHour = new Date(now)
  currentHour.setMinutes(0, 0, 0)
  const startAt = new Date(currentHour)
  startAt.setHours(startAt.getHours() - 23)

  const data = await getCustomerDataLogs({ customerId, unitId, startAt })
  if (!data) {
    return null
  }

  const hourlySlots = Array.from({ length: 24 }, (_, index) => {
    const hourStart = new Date(startAt)
    hourStart.setHours(startAt.getHours() + index)
    return {
      key: hourStart.getTime(),
      timestamp: hourStart.toISOString(),
      hour: hourStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      values: [] as number[],
    }
  })

  const slotByTime = new Map(hourlySlots.map((slot) => [slot.key, slot]))

  for (const log of data.logs) {
    const meter = findMeter(meterEntriesFromPayload(log.meter_payload), meterKey)
    if (!meter) {
      continue
    }

    const ir = meterMetricValue(meter, "IR")
    const iy = meterMetricValue(meter, "IY")
    const ib = meterMetricValue(meter, "IB")
    const available = [ir, iy, ib].filter((value): value is number => value != null)

    if (available.length === 0) {
      continue
    }

    const hourStart = new Date(log.device_timestamp)
    hourStart.setMinutes(0, 0, 0)
    const slot = slotByTime.get(hourStart.getTime())
    if (!slot) {
      continue
    }

    const averageCurrent = available.reduce((sum, value) => sum + value, 0) / available.length
    slot.values.push(averageCurrent)
  }

  return {
    points: hourlySlots.map((slot) => ({
      timestamp: slot.timestamp,
      hour: slot.hour,
      averageCurrent:
        slot.values.length > 0
          ? slot.values.reduce((sum, value) => sum + value, 0) / slot.values.length
          : null,
    })),
    computedAt: new Date().toISOString(),
  }
}

export async function getCustomerEmsVoltageHourlyStats({
  customerId,
  unitId,
  meterKey,
}: {
  customerId: number
  unitId: string
  meterKey: string
}) {
  const now = new Date()
  const currentHour = new Date(now)
  currentHour.setMinutes(0, 0, 0)
  const startAt = new Date(currentHour)
  startAt.setHours(startAt.getHours() - 11)

  const data = await getCustomerDataLogs({ customerId, unitId, startAt })
  if (!data) {
    return null
  }

  const hourlySlots = Array.from({ length: 12 }, (_, index) => {
    const hourStart = new Date(startAt)
    hourStart.setHours(startAt.getHours() + index)
    return {
      key: hourStart.getTime(),
      timestamp: hourStart.toISOString(),
      hour: hourStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      llValues: [] as number[],
      lnValues: [] as number[],
    }
  })

  const slotByTime = new Map(hourlySlots.map((slot) => [slot.key, slot]))

  for (const log of data.logs) {
    const meter = findMeter(meterEntriesFromPayload(log.meter_payload), meterKey)
    if (!meter) {
      continue
    }

    const vry = meterMetricValue(meter, "VRY")
    const vyb = meterMetricValue(meter, "VYB")
    const vbr = meterMetricValue(meter, "VBR")
    const vrn = meterMetricValue(meter, "VRN")
    const vyn = meterMetricValue(meter, "VYN")
    const vbn = meterMetricValue(meter, "VBN")

    const llValues = [vry, vyb, vbr].filter((value): value is number => value != null)
    const lnValues = [vrn, vyn, vbn].filter((value): value is number => value != null)

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
      slot.llValues.push(llValues.reduce((sum, value) => sum + value, 0) / llValues.length)
    }

    if (lnValues.length > 0) {
      slot.lnValues.push(lnValues.reduce((sum, value) => sum + value, 0) / lnValues.length)
    }
  }

  return {
    points: hourlySlots.map((slot) => ({
      timestamp: slot.timestamp,
      hour: slot.hour,
      averageVoltageLL:
        slot.llValues.length > 0
          ? slot.llValues.reduce((sum, value) => sum + value, 0) / slot.llValues.length
          : null,
      averageVoltageLN:
        slot.lnValues.length > 0
          ? slot.lnValues.reduce((sum, value) => sum + value, 0) / slot.lnValues.length
          : null,
    })),
    computedAt: new Date().toISOString(),
  }
}

export async function getCustomerEmsEnergyAnalytics({
  customerId,
  unitId,
  meterKey,
  dailyRange,
}: {
  customerId: number
  unitId: string
  meterKey: string
  dailyRange: EnergyDailyRange
}): Promise<EnergyAnalytics | null> {
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

  const data = await getCustomerDataLogs({ customerId, unitId, startAt: earliestStart })
  if (!data) {
    return null
  }

  const readings: EnergyAnalyticsPoint[] = []
  for (const log of data.logs) {
    const meter = findMeter(meterEntriesFromPayload(log.meter_payload), meterKey)
    if (!meter) {
      continue
    }

    const kwh = meterMetricValue(meter, "Kwh")
    if (kwh == null) {
      continue
    }

    readings.push({ at: new Date(log.device_timestamp), kwh })
  }

  const monthlyReadings = readings.filter((point) => point.at.getTime() >= monthStart.getTime())

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
    where: { unit_id: unitId, customer_id: customerId },
    select: { id: true, unit_id: true },
  })
}

export type CustomerEmsLogsPage = {
  logs: Array<{
    id: string
    deviceTimestamp: string
    status: string
    meters: MeterEntry[]
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

  const targetCount = normalizedLimit + 1
  const batchSize = Math.min(Math.max(normalizedLimit * 3, 100), 500)
  const dataRows: Array<{
    id: bigint
    device_timestamp: Date
    status_value: string | null
    raw_payload: Prisma.JsonValue
    meter_payload: Prisma.JsonValue
  }> = []
  let scanCursor = cursorId

  while (dataRows.length < targetCount) {
    const rows = await prisma.emsLog.findMany({
      where: {
        ems_unit_id: unit.id,
        message_type: "data",
        ...(scanCursor ? { id: { lt: scanCursor } } : {}),
      },
      orderBy: [{ id: "desc" }],
      take: batchSize,
      select: {
        id: true,
        device_timestamp: true,
        status_value: true,
        raw_payload: true,
        meter_payload: true,
      },
    })

    if (rows.length === 0) {
      break
    }

    for (const row of rows) {
      if (meterEntriesFromPayload(row.meter_payload).length > 0) {
        dataRows.push(row)
        if (dataRows.length >= targetCount) {
          break
        }
      }
    }

    scanCursor = rows[rows.length - 1]?.id ?? null
    if (rows.length < batchSize || scanCursor == null) {
      break
    }
  }

  const hasMore = dataRows.length > normalizedLimit
  const pageRows = hasMore ? dataRows.slice(0, normalizedLimit) : dataRows

  return {
    logs: pageRows.map((log) => ({
      id: log.id.toString(),
      deviceTimestamp: log.device_timestamp.toISOString(),
      status: inferLogStatus(log.status_value, log.raw_payload),
      meters: meterEntriesFromPayload(log.meter_payload),
    })),
    nextCursor:
      hasMore && pageRows.length > 0 ? pageRows[pageRows.length - 1]?.id.toString() ?? null : null,
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

function mapRawCsvRow({
  log,
  meterKey,
}: {
  log: {
    device_timestamp: Date
    meter_payload: Prisma.JsonValue
  }
  meterKey: string
}) {
  const meter = findMeter(meterEntriesFromPayload(log.meter_payload), meterKey)
  if (!meter) {
    return null
  }

  return {
    timestamp: log.device_timestamp.toISOString(),
    kwh: meterMetricValue(meter, "Kwh"),
    kvah: meterMetricValue(meter, "KvAh"),
    kvarh: meterMetricValue(meter, "KvArh"),
    voltageRn: meterMetricValue(meter, "VRN"),
    voltageYn: meterMetricValue(meter, "VYN"),
    voltageBn: meterMetricValue(meter, "VBN"),
    voltageRy: meterMetricValue(meter, "VRY"),
    voltageYb: meterMetricValue(meter, "VYB"),
    voltageBr: meterMetricValue(meter, "VBR"),
    currentR: meterMetricValue(meter, "IR"),
    currentY: meterMetricValue(meter, "IY"),
    currentB: meterMetricValue(meter, "IB"),
    kwR: meterMetricValue(meter, "KW-R"),
    kwY: meterMetricValue(meter, "KW-Y"),
    kwB: meterMetricValue(meter, "KW-B"),
    pfR: meterMetricValue(meter, "PF-R"),
    pfY: meterMetricValue(meter, "PF-Y"),
    pfB: meterMetricValue(meter, "PF-B"),
    frequency: meterMetricValue(meter, "Freq"),
  } satisfies CustomerRawCsvRow
}

export async function countCustomerEmsRawRows({
  customerId,
  unitId,
  meterKey,
  startAt,
  endAt,
  batchSize = 2_000,
}: {
  customerId: number
  unitId: string
  meterKey: string
  startAt?: Date
  endAt?: Date
  batchSize?: number
}): Promise<number | null> {
  const unit = await getCustomerUnitForLogs({ customerId, unitId })
  if (!unit) {
    return null
  }

  const safeBatchSize = Math.min(Math.max(Math.floor(batchSize), 100), 10_000)
  const deviceTimestampFilter = buildDeviceTimestampFilter({ startAt, endAt })
  let cursorId: bigint | null = null
  let count = 0

  while (true) {
    const rows: Array<{
      id: bigint
      device_timestamp: Date
      meter_payload: Prisma.JsonValue
    }> = await prisma.emsLog.findMany({
      where: {
        ems_unit_id: unit.id,
        message_type: "data",
        ...(deviceTimestampFilter ? { device_timestamp: deviceTimestampFilter } : {}),
        ...(cursorId ? { id: { gt: cursorId } } : {}),
      },
      orderBy: [{ id: "asc" }],
      take: safeBatchSize,
      select: {
        id: true,
        device_timestamp: true,
        meter_payload: true,
      },
    })

    if (rows.length === 0) {
      break
    }

    for (const log of rows) {
      const row = mapRawCsvRow({ log, meterKey })
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
  meterKey,
  startAt,
  endAt,
  batchSize = 2_000,
}: {
  customerId: number
  unitId: string
  meterKey: string
  startAt?: Date
  endAt?: Date
  batchSize?: number
}): AsyncGenerator<CustomerRawCsvRow, void, void> {
  const unit = await getCustomerUnitForLogs({ customerId, unitId })
  if (!unit) {
    return
  }

  const safeBatchSize = Math.min(Math.max(Math.floor(batchSize), 100), 10_000)
  const deviceTimestampFilter = buildDeviceTimestampFilter({ startAt, endAt })
  let cursorId: bigint | null = null

  while (true) {
    const rows: Array<{
      id: bigint
      device_timestamp: Date
      meter_payload: Prisma.JsonValue
    }> = await prisma.emsLog.findMany({
      where: {
        ems_unit_id: unit.id,
        message_type: "data",
        ...(deviceTimestampFilter ? { device_timestamp: deviceTimestampFilter } : {}),
        ...(cursorId ? { id: { gt: cursorId } } : {}),
      },
      orderBy: [{ id: "asc" }],
      take: safeBatchSize,
      select: {
        id: true,
        device_timestamp: true,
        meter_payload: true,
      },
    })

    if (rows.length === 0) {
      break
    }

    for (const log of rows) {
      const row = mapRawCsvRow({ log, meterKey })
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
