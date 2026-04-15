import { Prisma } from "@prisma/client"

import { buildDefaultFieldTemplate } from "@/lib/ems/config"
import { prisma } from "@/lib/prisma"
import type {
  EmsFieldTemplateEntry,
  EmsPayload,
  EmsRtuOverride,
  EmsRtuOverrides,
  EmsRtuPayload,
  EmsStatusPayload,
  MappedRtuEntry,
} from "@/lib/ems/types"

function asJson(value: unknown) {
  return value as Prisma.InputJsonValue
}

export function parseTopicUnitId(topic: string) {
  const trimmed = topic.replace(/^\/+/, "")
  const [unitId] = trimmed.split("/")
  return unitId || null
}

export function parseTopicMessageType(topic: string) {
  const trimmed = topic.replace(/^\/+/, "")
  const parts = trimmed.split("/")
  return parts[1]?.trim().toLowerCase() || null
}

export function parseIncomingPayload(raw: string) {
  return JSON.parse(raw) as unknown
}

export function parseDataPayload(raw: unknown) {
  const payload = raw as EmsPayload

  if (!payload?.ID || !Array.isArray(payload.RTU)) {
    throw new Error("Invalid EMS payload")
  }

  return payload
}

export function parseStatusPayload(raw: unknown) {
  const payload = raw as EmsStatusPayload
  if (!payload?.ID || typeof payload.ID !== "string") {
    throw new Error("Invalid EMS status payload")
  }

  const rawState =
    typeof payload.state === "string"
      ? payload.state
      : typeof payload.Status === "string"
        ? payload.Status
        : ""

  const normalizedState = rawState.trim().toLowerCase()
  if (normalizedState !== "online" && normalizedState !== "offline") {
    throw new Error("Status payload state must be online or offline")
  }

  return {
    id: payload.ID.trim(),
    state: normalizedState as "online" | "offline",
    reason: typeof payload.reason === "string" ? payload.reason.trim() || null : null,
    timestamp: parseTimestamp(payload.ts ?? payload.TS),
    raw: payload,
  }
}

export function normalizeFieldTemplate(input: unknown): EmsFieldTemplateEntry[] {
  if (!Array.isArray(input)) {
    return buildDefaultFieldTemplate()
  }

  const normalized = input
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null
      }

      const value = entry as Partial<EmsFieldTemplateEntry>
      const index = Number(value.index)
      const order = Number(value.order)

      if (Number.isNaN(index) || typeof value.key !== "string" || typeof value.label !== "string") {
        return null
      }

      return {
        index,
        key: value.key,
        label: value.label,
        visible: value.visible !== false,
        order: Number.isNaN(order) ? index : order,
      } satisfies EmsFieldTemplateEntry
    })
    .filter((entry): entry is EmsFieldTemplateEntry => Boolean(entry))

  return normalized.length > 0 ? normalized.sort((a, b) => a.order - b.order) : buildDefaultFieldTemplate()
}

export function normalizeRtuOverrides(input: unknown): EmsRtuOverrides {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {}
  }

  const overrides: EmsRtuOverrides = {}

  for (const [key, value] of Object.entries(input)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue
    }

    const override = value as EmsRtuOverride
    overrides[key] = {
      nickname: typeof override.nickname === "string" ? override.nickname : undefined,
      fieldTemplate: normalizeFieldTemplate(override.fieldTemplate),
    }
  }

  return overrides
}

function getRtuKey(rtu: Pick<EmsRtuPayload, "id" | "slave">) {
  if (typeof rtu.id === "number" && !Number.isNaN(rtu.id)) {
    return String(rtu.id)
  }

  return rtu.slave?.trim() || "unknown"
}

function resolveRtuOverride(overrides: EmsRtuOverrides, rtu: Pick<EmsRtuPayload, "id" | "slave">) {
  return overrides[getRtuKey(rtu)]
}

function mapRtus({
  rtus,
  unitTemplate,
  overrides,
}: {
  rtus: EmsRtuPayload[]
  unitTemplate: EmsFieldTemplateEntry[]
  overrides: EmsRtuOverrides
}): MappedRtuEntry[] {
  return rtus.map((rtu) => {
    const override = resolveRtuOverride(overrides, rtu)
    const metrics: Record<string, number | null> = {}

    for (const field of unitTemplate) {
      if (!field.visible) {
        continue
      }

      const rawValue = Array.isArray(rtu.data) ? rtu.data[field.index] : undefined
      metrics[field.key] = typeof rawValue === "number" ? rawValue : null
    }

    return {
      id: typeof rtu.id === "number" ? rtu.id : null,
      slave: rtu.slave?.trim() || null,
      nickname: override?.nickname?.trim() || rtu.slave?.trim() || `RTU-${rtu.id ?? "unknown"}`,
      res: rtu.res?.trim() || null,
      datalen: typeof rtu.datalen === "number" ? rtu.datalen : Array.isArray(rtu.data) ? rtu.data.length : 0,
      metrics,
    }
  })
}

function parseTimestamp(value?: string) {
  const timestamp = value ? new Date(value) : new Date()
  return Number.isNaN(timestamp.getTime()) ? new Date() : timestamp
}

export async function ingestEmsPayload({
  topic,
  payload,
}: {
  topic: string
  payload: EmsPayload
}) {
  const unitId = payload.ID?.trim()
  if (!unitId) {
    throw new Error("Payload is missing ID")
  }

  const topicUnitId = parseTopicUnitId(topic)
  if (topicUnitId && topicUnitId !== unitId) {
    throw new Error(`Topic unit ${topicUnitId} does not match payload unit ${unitId}`)
  }

  const existing = await prisma.emsUnit.findUnique({
    where: { unit_id: unitId },
    select: {
      unit_field_template: true,
      rtu_overrides: true,
    },
  })

  const unitTemplate = normalizeFieldTemplate(existing?.unit_field_template)
  const overrides = normalizeRtuOverrides(existing?.rtu_overrides)
  const timestamp = parseTimestamp(payload.TS)
  const rawRtuArray = Array.isArray(payload.RTU) ? payload.RTU : []

  const unit = await prisma.emsUnit.upsert({
    where: { unit_id: unitId },
    create: {
      unit_id: unitId,
      location_label: payload.Location?.trim() || null,
      device_type: payload.DT?.trim() || null,
      last_seen_at: timestamp,
      topic_path: topic,
      unit_field_template: asJson(unitTemplate),
      rtu_overrides: asJson(overrides),
    },
    update: {
      location_label: payload.Location?.trim() || null,
      device_type: payload.DT?.trim() || null,
      last_seen_at: timestamp,
      topic_path: topic,
    },
    select: {
      id: true,
      unit_field_template: true,
      rtu_overrides: true,
    },
  })

  const effectiveTemplate = normalizeFieldTemplate(unit.unit_field_template)
  const effectiveOverrides = normalizeRtuOverrides(unit.rtu_overrides)
  const mappedRtuArray = mapRtus({
    rtus: rawRtuArray,
    unitTemplate: effectiveTemplate,
    overrides: effectiveOverrides,
  })

  await prisma.emsLog.create({
    data: {
      ems_unit_id: unit.id,
      device_timestamp: timestamp,
      raw_unit_payload: asJson(payload),
      raw_rtu_array: asJson(rawRtuArray),
      mapped_rtu_array: asJson(mappedRtuArray),
    },
  })

  return {
    unitId,
    unitDbId: unit.id.toString(),
    slaveCount: rawRtuArray.length,
  }
}

export async function ingestEmsStatusPayload({
  topic,
  payload,
}: {
  topic: string
  payload: unknown
}) {
  const parsed = parseStatusPayload(payload)
  const unitId = parsed.id
  if (!unitId) {
    throw new Error("Status payload is missing ID")
  }

  const topicUnitId = parseTopicUnitId(topic)
  if (topicUnitId && topicUnitId !== unitId) {
    throw new Error(`Topic unit ${topicUnitId} does not match payload unit ${unitId}`)
  }

  const existing = await prisma.emsUnit.findUnique({
    where: { unit_id: unitId },
    select: {
      unit_field_template: true,
      rtu_overrides: true,
    },
  })

  const unitTemplate = normalizeFieldTemplate(existing?.unit_field_template)
  const overrides = normalizeRtuOverrides(existing?.rtu_overrides)

  const unit = await prisma.emsUnit.upsert({
    where: { unit_id: unitId },
    create: {
      unit_id: unitId,
      last_seen_at: parsed.timestamp,
      topic_path: topic,
      unit_field_template: asJson(unitTemplate),
      rtu_overrides: asJson(overrides),
    },
    update: {
      last_seen_at: parsed.timestamp,
      topic_path: topic,
    },
    select: {
      id: true,
    },
  })

  await prisma.emsLog.create({
    data: {
      ems_unit_id: unit.id,
      device_timestamp: parsed.timestamp,
      raw_unit_payload: asJson({
        ID: unitId,
        state: parsed.state,
        reason: parsed.reason,
        TS: parsed.timestamp.toISOString(),
      }),
      raw_rtu_array: asJson([]),
      mapped_rtu_array: asJson([]),
    },
  })

  return {
    unitId,
    state: parsed.state,
  }
}

export function mapStoredRtuArray({
  rawRtuArray,
  unitTemplate,
  overrides,
}: {
  rawRtuArray: unknown
  unitTemplate: EmsFieldTemplateEntry[]
  overrides: EmsRtuOverrides
}) {
  if (!Array.isArray(rawRtuArray)) {
    return []
  }

  const rtus = rawRtuArray.filter(
    (value): value is EmsRtuPayload => Boolean(value) && typeof value === "object" && !Array.isArray(value)
  )

  return mapRtus({
    rtus,
    unitTemplate,
    overrides,
  })
}
