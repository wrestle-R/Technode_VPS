import type {
  AlertDirection,
  AlertMeterScope,
  AlertRuleType,
  AlertSeverity,
  AlertStatus,
  Prisma,
} from "@prisma/client"

import { prisma } from "@/lib/prisma"

export type AlertRecipientDto = {
  id: string
  name: string
  email: string
  role: string | null
  phone: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type AlertRuleDto = {
  id: string
  unitId: string
  type: AlertRuleType
  severity: AlertSeverity
  enabled: boolean
  meterScope: AlertMeterScope
  meterKeys: string[]
  fieldKey: string | null
  direction: AlertDirection | null
  thresholdValue: number | null
  createdAt: string
  updatedAt: string
}

export type AlertInstanceDto = {
  id: string
  unitId: string
  ruleId: string
  meterKey: string | null
  fieldKey: string | null
  type: AlertRuleType
  severity: AlertSeverity
  status: AlertStatus
  title: string
  message: string
  triggerValue: number | null
  thresholdValue: number | null
  seenAt: string | null
  triggeredAt: string
  resolvedAt: string | null
  lastEmailedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AlertListFilters = {
  status?: AlertStatus
  severity?: AlertSeverity
  type?: AlertRuleType
  seen?: "true" | "false"
  unitId?: string
  meterKey?: string
  page?: number
  limit?: number
}

function toRecipientDto(row: {
  id: bigint
  name: string
  email: string
  role: string | null
  phone: string | null
  enabled: boolean
  created_at: Date
  updated_at: Date
}): AlertRecipientDto {
  return {
    id: row.id.toString(),
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    enabled: row.enabled,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function toRuleDto(row: {
  id: bigint
  unit_id: string
  type: AlertRuleType
  severity: AlertSeverity
  enabled: boolean
  meter_scope: AlertMeterScope
  meter_keys: string[]
  field_key: string | null
  direction: AlertDirection | null
  threshold_value: number | null
  created_at: Date
  updated_at: Date
}): AlertRuleDto {
  return {
    id: row.id.toString(),
    unitId: row.unit_id,
    type: row.type,
    severity: row.severity,
    enabled: row.enabled,
    meterScope: row.meter_scope,
    meterKeys: row.meter_keys,
    fieldKey: row.field_key,
    direction: row.direction,
    thresholdValue: row.threshold_value,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function toInstanceDto(row: {
  id: bigint
  rule_id: bigint
  unit_id: string
  meter_key: string | null
  field_key: string | null
  type: AlertRuleType
  severity: AlertSeverity
  status: AlertStatus
  title: string
  message: string
  trigger_value: number | null
  threshold_value: number | null
  seen_at: Date | null
  triggered_at: Date
  resolved_at: Date | null
  last_emailed_at: Date | null
  created_at: Date
  updated_at: Date
}): AlertInstanceDto {
  return {
    id: row.id.toString(),
    unitId: row.unit_id,
    ruleId: row.rule_id.toString(),
    meterKey: row.meter_key,
    fieldKey: row.field_key,
    type: row.type,
    severity: row.severity,
    status: row.status,
    title: row.title,
    message: row.message,
    triggerValue: row.trigger_value,
    thresholdValue: row.threshold_value,
    seenAt: row.seen_at?.toISOString() ?? null,
    triggeredAt: row.triggered_at.toISOString(),
    resolvedAt: row.resolved_at?.toISOString() ?? null,
    lastEmailedAt: row.last_emailed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function listAlertRecipients(customerId: number) {
  const rows = await prisma.alertRecipient.findMany({
    where: { customer_id: customerId },
    orderBy: [{ enabled: "desc" }, { created_at: "desc" }],
  })

  return rows.map(toRecipientDto)
}

export async function createAlertRecipient({
  customerId,
  name,
  email,
  role,
  phone,
  enabled,
}: {
  customerId: number
  name: string
  email: string
  role: string | null
  phone: string | null
  enabled: boolean
}) {
  const row = await prisma.alertRecipient.create({
    data: {
      customer_id: customerId,
      name,
      email,
      role,
      phone,
      enabled,
    },
  })

  return toRecipientDto(row)
}

export async function updateAlertRecipient({
  customerId,
  id,
  data,
}: {
  customerId: number
  id: bigint
  data: Prisma.AlertRecipientUpdateInput
}) {
  const existing = await prisma.alertRecipient.findFirst({
    where: {
      id,
      customer_id: customerId,
    },
  })

  if (!existing) {
    return null
  }

  const row = await prisma.alertRecipient.update({
    where: { id },
    data,
  })

  return toRecipientDto(row)
}

export async function deleteAlertRecipient(customerId: number, id: bigint) {
  const existing = await prisma.alertRecipient.findFirst({
    where: {
      id,
      customer_id: customerId,
    },
    select: { id: true },
  })

  if (!existing) {
    return false
  }

  await prisma.alertRecipient.delete({ where: { id } })
  return true
}

export async function listAlertRules(customerId: number) {
  const rows = await prisma.alertRule.findMany({
    where: { customer_id: customerId },
    orderBy: [{ enabled: "desc" }, { created_at: "desc" }],
  })

  return rows.map(toRuleDto)
}

export async function createAlertRule({
  customerId,
  unitId,
  type,
  severity,
  enabled,
  meterScope,
  meterKeys,
  fieldKey,
  direction,
  thresholdValue,
}: {
  customerId: number
  unitId: string
  type: AlertRuleType
  severity: AlertSeverity
  enabled: boolean
  meterScope: AlertMeterScope
  meterKeys: string[]
  fieldKey: string | null
  direction: AlertDirection | null
  thresholdValue: number | null
}) {
  const row = await prisma.alertRule.create({
    data: {
      customer_id: customerId,
      unit_id: unitId,
      type,
      severity,
      enabled,
      meter_scope: meterScope,
      meter_keys: meterKeys,
      field_key: fieldKey,
      direction,
      threshold_value: thresholdValue,
    },
  })

  return toRuleDto(row)
}

export async function updateAlertRule({
  customerId,
  id,
  data,
}: {
  customerId: number
  id: bigint
  data: Prisma.AlertRuleUpdateInput
}) {
  const existing = await prisma.alertRule.findFirst({
    where: {
      id,
      customer_id: customerId,
    },
  })

  if (!existing) {
    return null
  }

  const row = await prisma.alertRule.update({
    where: { id },
    data,
  })

  return toRuleDto(row)
}

export async function deleteAlertRule(customerId: number, id: bigint) {
  const existing = await prisma.alertRule.findFirst({
    where: {
      id,
      customer_id: customerId,
    },
    select: { id: true },
  })

  if (!existing) {
    return false
  }

  await prisma.alertRule.delete({ where: { id } })
  return true
}

export async function listAlertInstances(
  customerId: number,
  filters: AlertListFilters
) {
  const page = Math.max(filters.page ?? 1, 1)
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)
  const skip = (page - 1) * limit

  const where: Prisma.AlertInstanceWhereInput = {
    customer_id: customerId,
  }

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.severity) {
    where.severity = filters.severity
  }

  if (filters.type) {
    where.type = filters.type
  }

  if (filters.unitId) {
    where.unit_id = filters.unitId
  }

  if (filters.meterKey) {
    where.meter_key = filters.meterKey
  }

  if (filters.seen === "true") {
    where.seen_at = { not: null }
  } else if (filters.seen === "false") {
    where.seen_at = null
  }

  const [total, rows] = await Promise.all([
    prisma.alertInstance.count({ where }),
    prisma.alertInstance.findMany({
      where,
      orderBy: [{ status: "asc" }, { triggered_at: "desc" }],
      skip,
      take: limit,
    }),
  ])

  return {
    page,
    limit,
    total,
    rows: rows.map(toInstanceDto),
  }
}

export async function listRecentOpenUnseenAlerts(customerId: number, limit = 5) {
  const rows = await prisma.alertInstance.findMany({
    where: {
      customer_id: customerId,
      status: "open",
      seen_at: null,
    },
    orderBy: [{ triggered_at: "desc" }],
    take: Math.min(Math.max(limit, 1), 30),
  })

  return rows.map(toInstanceDto)
}

export async function markAlertSeen(customerId: number, id: bigint) {
  const row = await prisma.alertInstance.findFirst({
    where: {
      id,
      customer_id: customerId,
    },
  })

  if (!row) {
    return null
  }

  const updated = await prisma.alertInstance.update({
    where: { id },
    data: {
      seen_at: row.seen_at ?? new Date(),
    },
  })

  return toInstanceDto(updated)
}

export async function markAllAlertsSeen(customerId: number) {
  const result = await prisma.alertInstance.updateMany({
    where: {
      customer_id: customerId,
      seen_at: null,
      status: "open",
    },
    data: {
      seen_at: new Date(),
    },
  })

  return result.count
}

export async function listEnabledRecipientEmails(customerId: number) {
  const rows = await prisma.alertRecipient.findMany({
    where: {
      customer_id: customerId,
      enabled: true,
    },
    orderBy: [{ created_at: "asc" }],
    select: {
      email: true,
      name: true,
    },
  })

  return rows
}
