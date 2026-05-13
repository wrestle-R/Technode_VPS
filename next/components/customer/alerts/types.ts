export type AlertRecipient = {
  id: string
  name: string
  email: string
  role: string | null
  phone: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type AlertRule = {
  id: string
  unitId: string
  type: "metric" | "offline"
  severity: "critical" | "warning" | "info"
  enabled: boolean
  meterScope: "single" | "multiple" | "all"
  meterKeys: string[]
  fieldKey: string | null
  direction: "above" | "below" | null
  thresholdValue: number | null
  createdAt: string
  updatedAt: string
}

export type AlertInstance = {
  id: string
  unitId: string
  ruleId: string
  meterKey: string | null
  fieldKey: string | null
  type: "metric" | "offline"
  severity: "critical" | "warning" | "info"
  status: "open" | "closed"
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
