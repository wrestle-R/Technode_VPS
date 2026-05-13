import type { AlertDirection, AlertMeterScope, Prisma } from "@prisma/client"

import { ALERT_EMAIL_RESEND_COOLDOWN_MS, formatRuleType, formatSeverity } from "@/lib/alerts/types"
import { sendSmtpMail } from "@/lib/alerts/smtp"
import { listEnabledRecipientEmails } from "@/lib/alerts/store"
import { prisma } from "@/lib/prisma"

type MeterPayload = Record<string, unknown>

function asJson(value: unknown) {
  return value as Prisma.InputJsonValue
}

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

function metricValueFromPayload(meterPayload: MeterPayload, fieldKey: string) {
  const exact = meterPayload[fieldKey]
  if (typeof exact === "number" && Number.isFinite(exact)) {
    return exact
  }

  if (typeof exact === "string") {
    const parsed = Number.parseFloat(exact)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  const wanted = normalized(fieldKey)
  for (const [key, value] of Object.entries(meterPayload)) {
    if (normalized(key) !== wanted) {
      continue
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }

    if (typeof value === "string") {
      const parsed = Number.parseFloat(value)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
}

function matchesDirection(value: number, direction: AlertDirection, threshold: number) {
  if (direction === "above") {
    return value > threshold
  }

  return value < threshold
}

function resolveMeterKeys(
  meterScope: AlertMeterScope,
  meterKeys: string[],
  availableMeterKeys: string[]
) {
  if (meterScope === "all") {
    return availableMeterKeys
  }

  const selected = new Set(
    meterKeys.map((key) => key.trim()).filter((key) => Boolean(key))
  )

  return availableMeterKeys.filter((key) => selected.has(key))
}

function buildMetricAlertText({
  unitId,
  meterKey,
  fieldKey,
  direction,
  threshold,
  value,
  severity,
}: {
  unitId: string
  meterKey: string
  fieldKey: string
  direction: AlertDirection
  threshold: number
  value: number
  severity: "critical" | "warning" | "info"
}) {
  const severityLabel = formatSeverity(severity)
  const descriptor = direction === "above" ? "High" : "Low"
  const title = `${severityLabel} ${fieldKey} ${descriptor}`
  const message = `Unit ${unitId}, meter ${meterKey}: ${fieldKey} is ${value.toFixed(3)} (${direction} ${threshold.toFixed(3)})`

  return { title, message }
}

function buildOfflineAlertText({
  unitId,
  severity,
}: {
  unitId: string
  severity: "critical" | "warning" | "info"
}) {
  const severityLabel = formatSeverity(severity)
  return {
    title: `${severityLabel} Device Offline`,
    message: `Unit ${unitId} reported Offline state.`,
  }
}

async function sendEmailsForAlertInstance(instanceId: bigint) {
  const instance = await prisma.alertInstance.findUnique({
    where: { id: instanceId },
    include: {
      rule: true,
      customer: {
        select: {
          customer_id: true,
          company: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  if (!instance) {
    return
  }

  const recipients = await listEnabledRecipientEmails(instance.customer_id)
  if (recipients.length === 0) {
    return
  }

  const severity = formatSeverity(instance.severity)
  const type = formatRuleType(instance.type)
  const subject = `[${severity}] ${type} - Unit ${instance.unit_id}`
  const text = [
    `Company: ${instance.customer.company.name}`,
    `Unit: ${instance.unit_id}`,
    `Type: ${type}`,
    `Severity: ${severity}`,
    `Message: ${instance.message}`,
    `Triggered At: ${instance.triggered_at.toISOString()}`,
  ].join("\n")

  for (const recipient of recipients) {
    try {
      await sendSmtpMail({
        to: recipient.email,
        subject,
        text,
      })

      await prisma.alertEmailLog.create({
        data: {
          alert_instance_id: instance.id,
          recipient_email: recipient.email,
          status: "sent",
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "SMTP send failed"

      await prisma.alertEmailLog.create({
        data: {
          alert_instance_id: instance.id,
          recipient_email: recipient.email,
          status: "failed",
          error_message: errorMessage.slice(0, 500),
        },
      })
    }
  }

  await prisma.alertInstance.update({
    where: { id: instance.id },
    data: {
      last_emailed_at: new Date(),
    },
  })
}

async function maybeSendAlertEmail(instanceId: bigint) {
  const instance = await prisma.alertInstance.findUnique({
    where: { id: instanceId },
    select: {
      id: true,
      last_emailed_at: true,
      status: true,
    },
  })

  if (!instance || instance.status !== "open") {
    return
  }

  const now = Date.now()
  const lastSent = instance.last_emailed_at?.getTime() ?? 0
  const canSend = !instance.last_emailed_at || now - lastSent >= ALERT_EMAIL_RESEND_COOLDOWN_MS

  if (!canSend) {
    return
  }

  await sendEmailsForAlertInstance(instance.id)
}

async function openOrUpdateMetricAlert({
  customerId,
  ruleId,
  unitId,
  meterKey,
  fieldKey,
  triggerValue,
  thresholdValue,
  severity,
  direction,
  timestamp,
}: {
  customerId: number
  ruleId: bigint
  unitId: string
  meterKey: string
  fieldKey: string
  triggerValue: number
  thresholdValue: number
  severity: "critical" | "warning" | "info"
  direction: AlertDirection
  timestamp: Date
}) {
  const text = buildMetricAlertText({
    unitId,
    meterKey,
    fieldKey,
    direction,
    threshold: thresholdValue,
    value: triggerValue,
    severity,
  })

  const existing = await prisma.alertInstance.findFirst({
    where: {
      rule_id: ruleId,
      unit_id: unitId,
      meter_key: meterKey,
      field_key: fieldKey,
      status: "open",
    },
    select: {
      id: true,
    },
  })

  if (!existing) {
    const created = await prisma.alertInstance.create({
      data: {
        customer_id: customerId,
        rule_id: ruleId,
        unit_id: unitId,
        meter_key: meterKey,
        field_key: fieldKey,
        type: "metric",
        severity,
        status: "open",
        title: text.title,
        message: text.message,
        context_json: asJson({
          unitId,
          meterKey,
          fieldKey,
          direction,
        }),
        trigger_value: triggerValue,
        threshold_value: thresholdValue,
        triggered_at: timestamp,
      },
      select: { id: true },
    })

    await maybeSendAlertEmail(created.id)
    return
  }

  await prisma.alertInstance.update({
    where: { id: existing.id },
    data: {
      title: text.title,
      message: text.message,
      context_json: asJson({
        unitId,
        meterKey,
        fieldKey,
        direction,
      }),
      trigger_value: triggerValue,
      threshold_value: thresholdValue,
    },
  })

  await maybeSendAlertEmail(existing.id)
}

async function closeMetricAlert({
  ruleId,
  unitId,
  meterKey,
  fieldKey,
  timestamp,
}: {
  ruleId: bigint
  unitId: string
  meterKey: string
  fieldKey: string
  timestamp: Date
}) {
  await prisma.alertInstance.updateMany({
    where: {
      rule_id: ruleId,
      unit_id: unitId,
      meter_key: meterKey,
      field_key: fieldKey,
      status: "open",
    },
    data: {
      status: "closed",
      resolved_at: timestamp,
    },
  })
}

export async function evaluateMetricAlertsForPayload({
  customerId,
  unitId,
  meters,
  timestamp,
}: {
  customerId: number
  unitId: string
  meters: Record<string, MeterPayload>
  timestamp: Date
}) {
  const rules = await prisma.alertRule.findMany({
    where: {
      customer_id: customerId,
      unit_id: unitId,
      type: "metric",
      enabled: true,
    },
  })

  const availableMeterKeys = Object.keys(meters)

  for (const rule of rules) {
    if (!rule.field_key || !rule.direction || typeof rule.threshold_value !== "number") {
      continue
    }

    const meterKeys = resolveMeterKeys(rule.meter_scope, rule.meter_keys, availableMeterKeys)

    for (const meterKey of meterKeys) {
      const meterPayload = meters[meterKey]
      if (!meterPayload) {
        continue
      }

      const triggerValue = metricValueFromPayload(meterPayload, rule.field_key)
      if (triggerValue == null) {
        continue
      }

      const breached = matchesDirection(triggerValue, rule.direction, rule.threshold_value)

      if (breached) {
        await openOrUpdateMetricAlert({
          customerId,
          ruleId: rule.id,
          unitId,
          meterKey,
          fieldKey: rule.field_key,
          triggerValue,
          thresholdValue: rule.threshold_value,
          severity: rule.severity,
          direction: rule.direction,
          timestamp,
        })
      } else {
        await closeMetricAlert({
          ruleId: rule.id,
          unitId,
          meterKey,
          fieldKey: rule.field_key,
          timestamp,
        })
      }
    }
  }
}

async function openOfflineAlert({
  customerId,
  ruleId,
  unitId,
  severity,
  timestamp,
}: {
  customerId: number
  ruleId: bigint
  unitId: string
  severity: "critical" | "warning" | "info"
  timestamp: Date
}) {
  const existing = await prisma.alertInstance.findFirst({
    where: {
      rule_id: ruleId,
      unit_id: unitId,
      meter_key: null,
      field_key: null,
      status: "open",
    },
    select: {
      id: true,
    },
  })

  const text = buildOfflineAlertText({ unitId, severity })

  if (!existing) {
    const created = await prisma.alertInstance.create({
      data: {
        customer_id: customerId,
        rule_id: ruleId,
        unit_id: unitId,
        meter_key: null,
        field_key: null,
        type: "offline",
        severity,
        status: "open",
        title: text.title,
        message: text.message,
        context_json: asJson({ unitId, state: "offline" }),
        triggered_at: timestamp,
      },
      select: { id: true },
    })

    await maybeSendAlertEmail(created.id)
    return
  }

  await prisma.alertInstance.update({
    where: { id: existing.id },
    data: {
      title: text.title,
      message: text.message,
      context_json: asJson({ unitId, state: "offline" }),
    },
  })

  await maybeSendAlertEmail(existing.id)
}

async function closeOfflineAlert({
  ruleId,
  unitId,
  timestamp,
}: {
  ruleId: bigint
  unitId: string
  timestamp: Date
}) {
  await prisma.alertInstance.updateMany({
    where: {
      rule_id: ruleId,
      unit_id: unitId,
      meter_key: null,
      field_key: null,
      status: "open",
    },
    data: {
      status: "closed",
      resolved_at: timestamp,
    },
  })
}

export async function evaluateOfflineAlertsForUnit({
  customerId,
  unitId,
  state,
  timestamp,
}: {
  customerId: number
  unitId: string
  state: "online" | "offline"
  timestamp: Date
}) {
  const rules = await prisma.alertRule.findMany({
    where: {
      customer_id: customerId,
      unit_id: unitId,
      type: "offline",
      enabled: true,
    },
  })

  for (const rule of rules) {
    if (state === "offline") {
      await openOfflineAlert({
        customerId,
        ruleId: rule.id,
        unitId,
        severity: rule.severity,
        timestamp,
      })
    } else {
      await closeOfflineAlert({
        ruleId: rule.id,
        unitId,
        timestamp,
      })
    }
  }
}

export async function evaluateAlertRulesForDataEvent({
  unitDbId,
  unitId,
  meters,
  status,
  timestamp,
}: {
  unitDbId: bigint
  unitId: string
  meters: Record<string, MeterPayload>
  status: "online" | "offline" | null
  timestamp: Date
}) {
  const unit = await prisma.emsUnit.findUnique({
    where: { id: unitDbId },
    select: {
      customer_id: true,
    },
  })

  if (!unit?.customer_id) {
    return
  }

  await evaluateMetricAlertsForPayload({
    customerId: unit.customer_id,
    unitId,
    meters,
    timestamp,
  })

  if (status) {
    await evaluateOfflineAlertsForUnit({
      customerId: unit.customer_id,
      unitId,
      state: status,
      timestamp,
    })
  }
}

export async function evaluateAlertRulesForConnectionEvent({
  unitDbId,
  unitId,
  state,
  timestamp,
}: {
  unitDbId: bigint
  unitId: string
  state: "online" | "offline"
  timestamp: Date
}) {
  const unit = await prisma.emsUnit.findUnique({
    where: { id: unitDbId },
    select: {
      customer_id: true,
    },
  })

  if (!unit?.customer_id) {
    return
  }

  await evaluateOfflineAlertsForUnit({
    customerId: unit.customer_id,
    unitId,
    state,
    timestamp,
  })
}

export async function sendTestAlertEmail(customerId: number) {
  const recipients = await listEnabledRecipientEmails(customerId)

  if (recipients.length === 0) {
    throw new Error("No enabled recipients configured")
  }

  const subject = "Technode EMS Alert Test"
  const text = `This is a test email from Technode EMS Alerts.\nTime: ${new Date().toISOString()}`

  const results: Array<{ email: string; status: "sent" | "failed"; error: string | null }> = []

  for (const recipient of recipients) {
    try {
      await sendSmtpMail({
        to: recipient.email,
        subject,
        text,
      })

      results.push({
        email: recipient.email,
        status: "sent",
        error: null,
      })
    } catch (error) {
      results.push({
        email: recipient.email,
        status: "failed",
        error: error instanceof Error ? error.message : "SMTP send failed",
      })
    }
  }

  return results
}
