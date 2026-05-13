import type {
  AlertDirection,
  AlertMeterScope,
  AlertRuleType,
  AlertSeverity,
  AlertStatus,
} from "@prisma/client"

export const ALERT_RULE_TYPES: AlertRuleType[] = ["metric", "offline"]
export const ALERT_SEVERITIES: AlertSeverity[] = ["critical", "warning", "info"]
export const ALERT_STATUSES: AlertStatus[] = ["open", "closed"]
export const ALERT_METER_SCOPES: AlertMeterScope[] = ["single", "multiple", "all"]
export const ALERT_DIRECTIONS: AlertDirection[] = ["above", "below"]

export const ALERT_EMAIL_RESEND_COOLDOWN_MS = 60 * 60 * 1000

export function isAlertRuleType(value: string): value is AlertRuleType {
  return ALERT_RULE_TYPES.includes(value as AlertRuleType)
}

export function isAlertSeverity(value: string): value is AlertSeverity {
  return ALERT_SEVERITIES.includes(value as AlertSeverity)
}

export function isAlertStatus(value: string): value is AlertStatus {
  return ALERT_STATUSES.includes(value as AlertStatus)
}

export function isAlertMeterScope(value: string): value is AlertMeterScope {
  return ALERT_METER_SCOPES.includes(value as AlertMeterScope)
}

export function isAlertDirection(value: string): value is AlertDirection {
  return ALERT_DIRECTIONS.includes(value as AlertDirection)
}

export function formatSeverity(value: AlertSeverity) {
  if (value === "critical") return "Critical"
  if (value === "warning") return "Warning"
  return "Info"
}

export function formatRuleType(value: AlertRuleType) {
  if (value === "metric") return "Metric"
  return "Device Offline"
}
