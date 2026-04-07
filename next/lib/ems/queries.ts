import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { mapStoredRtuArray, normalizeFieldTemplate, normalizeRtuOverrides } from "@/lib/ems/service"
import type { EmsFieldTemplateEntry, MappedRtuEntry } from "@/lib/ems/types"

function asNumber(value: { toString(): string } | null | undefined) {
  return value ? Number(value.toString()) : null
}

function inferStatus(_rawPayload: unknown, lastSeenAt: Date | null) {
  if (!lastSeenAt) {
    return "Unknown"
  }

  const ageMs = Date.now() - lastSeenAt.getTime()
  return ageMs <= 60 * 1000 ? "Online" : "Offline"
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

function formatMappedArray(
  rawRtuArray: unknown,
  unitTemplate: EmsFieldTemplateEntry[],
  overrides: ReturnType<typeof normalizeRtuOverrides>
) {
  return mapStoredRtuArray({
    rawRtuArray,
    unitTemplate,
    overrides,
  })
    .map((entry) => {
      const rtu = entry as MappedRtuEntry
      const rtuKey = rtu.id != null ? String(rtu.id) : rtu.slave ?? "unknown"
      const fieldTemplate = getFieldTemplateForRtu({ unitTemplate })
      const nickname = overrides[rtuKey]?.nickname?.trim() || rtu.nickname || rtu.slave || `RTU-${rtu.id ?? "unknown"}`
      const orderedMetrics = Object.entries(rtu.metrics ?? {})
        .map(([key, value]) => {
          const field = fieldTemplate.find((item) => item.key === key)
          return {
            key,
            label: field?.label ?? key,
            order: field?.order ?? Number.MAX_SAFE_INTEGER,
            value,
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
  const latestLog = unit.logs[0] ?? null
  const mappedRtus = latestLog ? formatMappedArray(latestLog.raw_rtu_array, unitTemplate, overrides) : []

  return {
    id: unit.id.toString(),
    unitId: unit.unit_id,
    customerId: unit.customer_id,
    customerName: unit.customer?.company.name ?? unit.customer?.customer_representative ?? null,
    locationLabel: unit.location_label,
    latitude: asNumber(unit.latitude),
    longitude: asNumber(unit.longitude),
    deviceType: unit.device_type,
    lastSeenAt: unit.last_seen_at?.toISOString() ?? null,
    topicPath: unit.topic_path,
    status: inferStatus(latestLog?.raw_unit_payload, unit.last_seen_at ?? null),
    unitFieldTemplate: unitTemplate,
    rtuOverrides: overrides,
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
      .filter((row): row is typeof row & { customer_id: number } => row.customer_id != null)
      .map((row) => [row.customer_id, row._count._all])
  )

  return customers.map((customer) => ({
    customerId: customer.customer_id,
    companyName: customer.company.name,
    customerName: customer.customer_representative ?? `Customer #${customer.customer_id}`,
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
        take: 20,
      },
    },
  })

  if (!unit) {
    return null
  }

  const formatted = formatUnit(unit)
  const unitTemplate = normalizeFieldTemplate(unit.unit_field_template)
  const overrides = normalizeRtuOverrides(unit.rtu_overrides)
  const knownRtuMap = new Map<string, ReturnType<typeof formatMappedArray>[number]>()

  for (const log of unit.logs) {
    for (const rtu of formatMappedArray(log.raw_rtu_array, unitTemplate, overrides)) {
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
      rtus: formatMappedArray(log.raw_rtu_array, unitTemplate, overrides),
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
    const latestLog = unit.logs[0] ?? null
    const mappedRtus = latestLog ? formatMappedArray(latestLog.raw_rtu_array, unitTemplate, overrides) : []

    return {
      id: unit.id.toString(),
      unitId: unit.unit_id,
      status: inferStatus(latestLog?.raw_unit_payload, unit.last_seen_at ?? null),
      locationLabel: unit.location_label,
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
        take: 20,
      },
    },
  })

  if (!unit) {
    return null
  }

  const unitTemplate = normalizeFieldTemplate(unit.unit_field_template)
  const overrides = normalizeRtuOverrides(unit.rtu_overrides)
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
    latestRtus: latestLog ? formatMappedArray(latestLog.raw_rtu_array, unitTemplate, overrides) : [],
    logs: unit.logs.map((log: (typeof unit.logs)[number]) => ({
      id: log.id.toString(),
      deviceTimestamp: log.device_timestamp.toISOString(),
      status: inferStatus(log.raw_unit_payload, log.device_timestamp),
      rtus: formatMappedArray(log.raw_rtu_array, unitTemplate, overrides),
    })),
  }
}
