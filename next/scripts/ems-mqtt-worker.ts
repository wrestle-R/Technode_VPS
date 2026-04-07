import mqtt from "mqtt"

import { MQTT_BROKER_URL, MQTT_TOPIC_PATTERNS } from "@/lib/ems/config"
import { ingestEmsPayload, parseIncomingPayload } from "@/lib/ems/service"

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
    const payload = parseIncomingPayload(message.toString("utf-8"))
    const result = await ingestEmsPayload({ topic, payload })
    console.log(`[ems:mqtt] stored ${result.unitId} with ${result.slaveCount} slaves`)
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
