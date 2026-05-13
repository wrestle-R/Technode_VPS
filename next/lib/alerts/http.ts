import type {
  AlertDirection,
  AlertMeterScope,
  AlertRuleType,
  AlertSeverity,
} from "@prisma/client"

import {
  isAlertDirection,
  isAlertMeterScope,
  isAlertRuleType,
  isAlertSeverity,
} from "@/lib/alerts/types"

export type RulePayload = {
  unitId: string
  type: AlertRuleType
  severity: AlertSeverity
  enabled: boolean
  meterScope: AlertMeterScope
  meterKeys: string[]
  fieldKey: string | null
  direction: AlertDirection | null
  thresholdValue: number | null
}

export function parseBigIntParam(value: string) {
  if (!/^\d+$/.test(value.trim())) {
    return null
  }

  try {
    return BigInt(value)
  } catch {
    return null
  }
}

export function parseBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
  }

  return fallback
}

export function parseRulePayload(input: unknown):
  | { ok: true; value: RulePayload }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid request body" }
  }

  const body = input as Record<string, unknown>
  const unitId = typeof body.unitId === "string" ? body.unitId.trim() : ""
  const typeRaw = typeof body.type === "string" ? body.type.trim().toLowerCase() : ""
  const severityRaw =
    typeof body.severity === "string" ? body.severity.trim().toLowerCase() : ""
  const meterScopeRaw =
    typeof body.meterScope === "string"
      ? body.meterScope.trim().toLowerCase()
      : ""
  const meterKeys = Array.isArray(body.meterKeys)
    ? body.meterKeys
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => Boolean(item))
    : []

  const fieldKey =
    typeof body.fieldKey === "string" && body.fieldKey.trim()
      ? body.fieldKey.trim()
      : null

  const directionRaw =
    typeof body.direction === "string" ? body.direction.trim().toLowerCase() : ""
  const thresholdRaw =
    typeof body.thresholdValue === "number"
      ? body.thresholdValue
      : typeof body.thresholdValue === "string"
        ? Number.parseFloat(body.thresholdValue)
        : Number.NaN

  if (!unitId) {
    return { ok: false, error: "unitId is required" }
  }

  if (!isAlertRuleType(typeRaw)) {
    return { ok: false, error: "type must be metric or offline" }
  }

  if (!isAlertSeverity(severityRaw)) {
    return { ok: false, error: "severity must be critical, warning or info" }
  }

  if (!isAlertMeterScope(meterScopeRaw)) {
    return { ok: false, error: "meterScope must be single, multiple or all" }
  }

  if ((meterScopeRaw === "single" || meterScopeRaw === "multiple") && meterKeys.length === 0) {
    return { ok: false, error: "meterKeys is required for single/multiple scope" }
  }

  if (meterScopeRaw === "single" && meterKeys.length !== 1) {
    return { ok: false, error: "single scope requires exactly one meter key" }
  }

  if (typeRaw === "metric") {
    if (!fieldKey) {
      return { ok: false, error: "fieldKey is required for metric alerts" }
    }

    if (!isAlertDirection(directionRaw)) {
      return { ok: false, error: "direction must be above or below for metric alerts" }
    }

    if (!Number.isFinite(thresholdRaw)) {
      return { ok: false, error: "thresholdValue must be a valid number for metric alerts" }
    }
  }

  return {
    ok: true,
    value: {
      unitId,
      type: typeRaw,
      severity: severityRaw,
      enabled: parseBoolean(body.enabled, true),
      meterScope: meterScopeRaw,
      meterKeys,
      fieldKey: typeRaw === "metric" ? fieldKey : null,
      direction: typeRaw === "metric" ? (directionRaw as AlertDirection) : null,
      thresholdValue: typeRaw === "metric" ? thresholdRaw : null,
    },
  }
}

export function parseRecipientPayload(input: unknown):
  | {
      ok: true
      value: {
        name: string
        email: string
        role: string | null
        phone: string | null
        enabled: boolean
      }
    }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid request body" }
  }

  const body = input as Record<string, unknown>
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : null
  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null
  const enabled = parseBoolean(body.enabled, true)

  if (!name) {
    return { ok: false, error: "name is required" }
  }

  if (!email || !email.includes("@")) {
    return { ok: false, error: "valid email is required" }
  }

  return {
    ok: true,
    value: { name, email, role, phone, enabled },
  }
}
