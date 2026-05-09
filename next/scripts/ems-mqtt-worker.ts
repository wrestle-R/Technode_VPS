import mqtt from "mqtt"

import { MQTT_BROKER_URL, MQTT_TOPIC_PATTERNS } from "@/lib/ems/config"
import {
  ingestEmsConnectionPayload,
  ingestEmsPayload,
  parseConnectionPayload,
  parseDataPayload,
  parseIncomingPayload,
  parseTopicMessageType,
} from "@/lib/ems/service"

const clientId = `technode-ems-worker-${Math.random().toString(16).slice(2, 10)}`

const client = mqtt.connect(MQTT_BROKER_URL, {
  clientId,
  reconnectPeriod: 2000,
})

client.on("connect", () => {
  console.log(`[ems:mqtt] connected to ${MQTT_BROKER_URL} as ${clientId}`)
  client.subscribe([...MQTT_TOPIC_PATTERNS], (error) => {
    if (error) {
      console.error("[ems:mqtt] subscribe failed", error)
      return
    }

    console.log(`[ems:mqtt] subscribed to ${MQTT_TOPIC_PATTERNS.join(", ")}`)
  })
})

client.on("message", async (topic, message) => {
  try {
    const rawPayload = parseIncomingPayload(message.toString("utf-8"))
    const messageType = parseTopicMessageType(topic)

    if (messageType === "connection") {
      const payload = parseConnectionPayload(rawPayload)
      const result = await ingestEmsConnectionPayload({ topic, payload })
      console.log(`[ems:mqtt] status ${result.unitId} -> ${result.state}`)
      return
    }

    if (messageType === "data") {
      const payload = parseDataPayload(rawPayload)
      const result = await ingestEmsPayload({ topic, payload })
      console.log(`[ems:mqtt] stored ${result.unitId} with ${result.meterCount} meters`)
      return
    }

    console.warn(`[ems:mqtt] ignored topic ${topic}`)
  } catch (error) {
    console.error("[ems:mqtt] failed to process message", error)
  }
})

client.on("error", (error) => {
  console.error("[ems:mqtt] client error", error)
})

client.on("reconnect", () => {
  console.log("[ems:mqtt] reconnecting")
})
