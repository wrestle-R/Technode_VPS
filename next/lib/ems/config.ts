export const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL ?? "mqtt://127.0.0.1:1883"
export const MQTT_TOPIC_PATTERNS = ["+/connection", "/+/connection", "+/data", "/+/data"] as const
