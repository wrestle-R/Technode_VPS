import { Prisma } from "@prisma/client"

import {
  evaluateAlertRulesForConnectionEvent,
  evaluateAlertRulesForDataEvent,
} from "@/lib/alerts/engine"
import { prisma } from "@/lib/prisma"
import type {
  EmsConnectionPayload,
  EmsDataPayload,
  EmsMeterPayload,
  ParsedConnectionPayload,
  ParsedDataPayload,
} from "@/lib/ems/types"

function asJson(value: unknown) {
  return value as Prisma.InputJsonValue
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isNumericDeviceId(value: string) {
  return /^[0-9]+$/.test(value)
}

function parseDeviceTimestamp(value?: string) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (/^\d+$/.test(trimmed)) {
    const numeric = Number(trimmed)
    if (Number.isFinite(numeric)) {
      const millis = trimmed.length >= 13 ? numeric : numeric * 1000
      const parsed = new Date(millis)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function resolvePayloadTimestamp(payload: { TS?: string; DT?: string }) {
  return parseDeviceTimestamp(payload.TS) ?? parseDeviceTimestamp(payload.DT) ?? new Date()
}

function normalizeStatus(raw: unknown) {
  if (typeof raw !== "string") {
    return null
  }

  const normalized = raw.trim().toLowerCase()
  if (normalized === "online" || normalized === "offline") {
    return normalized
  }

  return null
}

function strictLocation(raw: Record<string, unknown>) {
  if (!Object.prototype.hasOwnProperty.call(raw, "Location")) {
    return null
  }

  const value = raw.Location
  return typeof value === "string" ? value.trim() || null : null
}

export function parseTopicUnitId(topic: string) {
  const trimmed = topic.replace(/^\/+/, "")
  const [unitId] = trimmed.split("/")
  return unitId?.trim() || null
}

export function parseTopicMessageType(topic: string) {
  const trimmed = topic.replace(/^\/+/, "")
  const parts = trimmed.split("/")
  return parts[1]?.trim().toLowerCase() || null
}

export function parseIncomingPayload(raw: string) {
  return JSON.parse(raw) as unknown
}

export function parseConnectionPayload(raw: unknown): ParsedConnectionPayload {
  if (!isPlainObject(raw)) {
    throw new Error("Invalid connection payload")
  }

  const payload = raw as EmsConnectionPayload
  const id = typeof payload.ID === "string" ? payload.ID.trim() : ""
  if (!id) {
    throw new Error("Connection payload is missing ID")
  }
  if (!isNumericDeviceId(id)) {
    throw new Error("Connection payload ID must be numeric")
  }

  const state = normalizeStatus(payload.Status)
  if (!state) {
    throw new Error("Connection payload Status must be Online or Offline")
  }

  const typed = raw as Record<string, unknown>

  return {
    id,
    state,
    model: typeof payload.MODEL === "string" ? payload.MODEL.trim() || null : null,
    signal: typeof payload.Signal === "number" && Number.isFinite(payload.Signal) ? payload.Signal : null,
    location: strictLocation(typed),
    timestamp: resolvePayloadTimestamp(payload),
    raw: payload,
  }
}

function normalizeMeterMap(rawMeters: unknown) {
  if (!isPlainObject(rawMeters)) {
    throw new Error("Data payload must contain a data object")
  }

  const meters: Record<string, EmsMeterPayload> = {}
  for (const [meterKey, meterValue] of Object.entries(rawMeters)) {
    if (!meterKey.trim()) {
      continue
    }

    if (!isPlainObject(meterValue)) {
      continue
    }

    meters[meterKey] = meterValue
  }

  if (Object.keys(meters).length === 0) {
    throw new Error("Data payload must include at least one meter")
  }

  return meters
}

export function parseDataPayload(raw: unknown): ParsedDataPayload {
  if (!isPlainObject(raw)) {
    throw new Error("Invalid data payload")
  }

  const payload = raw as EmsDataPayload
  const id = typeof payload.ID === "string" ? payload.ID.trim() : ""
  if (!id) {
    throw new Error("Data payload is missing ID")
  }
  if (!isNumericDeviceId(id)) {
    throw new Error("Data payload ID must be numeric")
  }

  const typed = raw as Record<string, unknown>

  return {
    id,
    status: normalizeStatus(payload.Status),
    signal: typeof payload.Signal === "number" && Number.isFinite(payload.Signal) ? payload.Signal : null,
    location: strictLocation(typed),
    meters: normalizeMeterMap(payload.data),
    timestamp: resolvePayloadTimestamp(payload),
    raw: payload,
  }
}

export async function ingestEmsPayload({
  topic,
  payload,
}: {
  topic: string
  payload: ParsedDataPayload
}) {
  const topicUnitId = parseTopicUnitId(topic)
  if (topicUnitId && topicUnitId !== payload.id) {
    throw new Error(`Topic unit ${topicUnitId} does not match payload unit ${payload.id}`)
  }

  const unit = await prisma.emsUnit.upsert({
    where: { unit_id: payload.id },
    create: {
      unit_id: payload.id,
      location_label: payload.location,
      device_type: typeof payload.raw.MODEL === "string" ? payload.raw.MODEL.trim() || null : null,
      topic_path: topic,
      last_seen_at: payload.timestamp,
      last_status: payload.status === "offline" ? "Offline" : "Online",
    },
    update: {
      location_label: payload.location,
      topic_path: topic,
      last_seen_at: payload.timestamp,
      last_status: payload.status === "offline" ? "Offline" : "Online",
    },
    select: { id: true },
  })

  await prisma.emsLog.create({
    data: {
      ems_unit_id: unit.id,
      message_type: "data",
      status_value: payload.status,
      device_timestamp: payload.timestamp,
      raw_payload: asJson(payload.raw),
      meter_payload: asJson(payload.meters),
    },
  })

  try {
    await evaluateAlertRulesForDataEvent({
      unitDbId: unit.id,
      unitId: payload.id,
      meters: payload.meters,
      status: payload.status,
      timestamp: payload.timestamp,
    })
  } catch (error) {
    console.error("[ems:alerts] data evaluation failed", error)
  }

  return {
    unitId: payload.id,
    unitDbId: unit.id.toString(),
    meterCount: Object.keys(payload.meters).length,
  }
}

export async function ingestEmsConnectionPayload({
  topic,
  payload,
}: {
  topic: string
  payload: ParsedConnectionPayload
}) {
  const topicUnitId = parseTopicUnitId(topic)
  if (topicUnitId && topicUnitId !== payload.id) {
    throw new Error(`Topic unit ${topicUnitId} does not match payload unit ${payload.id}`)
  }

  const unit = await prisma.emsUnit.upsert({
    where: { unit_id: payload.id },
    create: {
      unit_id: payload.id,
      location_label: payload.location,
      device_type: payload.model,
      topic_path: topic,
      last_seen_at: payload.timestamp,
      last_status: payload.state === "offline" ? "Offline" : "Online",
    },
    update: {
      location_label: payload.location,
      device_type: payload.model,
      topic_path: topic,
      last_seen_at: payload.timestamp,
      last_status: payload.state === "offline" ? "Offline" : "Online",
    },
    select: { id: true },
  })

  await prisma.emsLog.create({
    data: {
      ems_unit_id: unit.id,
      message_type: "connection",
      status_value: payload.state,
      device_timestamp: payload.timestamp,
      raw_payload: asJson(payload.raw),
      meter_payload: asJson({}),
    },
  })

  try {
    await evaluateAlertRulesForConnectionEvent({
      unitDbId: unit.id,
      unitId: payload.id,
      state: payload.state,
      timestamp: payload.timestamp,
    })
  } catch (error) {
    console.error("[ems:alerts] connection evaluation failed", error)
  }

  return {
    unitId: payload.id,
    state: payload.state,
  }
}
