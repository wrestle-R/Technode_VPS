import type { EmsFieldTemplateEntry } from "@/lib/ems/types"

const DEFAULT_KEYS = [
  "VRN",
  "VYN",
  "VBN",
  "VRY",
  "VYB",
  "VBR",
  "IR",
  "IY",
  "IB",
  "KW-R",
  "KW-Y",
  "KW-B",
  "PF-R",
  "PF-Y",
  "PF-B",
  "Freq",
  "Kwh",
  "KvAh",
  "KvArh",
] as const

export const MQTT_PUBLIC_BROKER_URL = "mqtt://broker.hivemq.com:1883"
export const MQTT_TOPIC_PATTERNS = ["+/ems", "/+/ems"] as const

export function buildDefaultFieldTemplate(): EmsFieldTemplateEntry[] {
  return DEFAULT_KEYS.map((key, index) => ({
    index,
    key,
    label: key,
    visible: true,
    order: index,
  }))
}
