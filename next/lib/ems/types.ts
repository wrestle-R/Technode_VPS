export type EmsMeterPayload = Record<string, unknown>

export type EmsDataPayload = {
  ID?: string
  MODEL?: string
  Status?: string
  Signal?: number
  Location?: string
  data?: Record<string, EmsMeterPayload>
  TS?: string
  DT?: string
}

export type EmsConnectionPayload = {
  ID?: string
  MODEL?: string
  Status?: string
  Signal?: number
  Location?: string
  TS?: string
  DT?: string
}

export type ParsedConnectionPayload = {
  id: string
  state: "online" | "offline"
  model: string | null
  signal: number | null
  location: string | null
  timestamp: Date
  raw: EmsConnectionPayload
}

export type ParsedDataPayload = {
  id: string
  status: "online" | "offline" | null
  signal: number | null
  location: string | null
  meters: Record<string, EmsMeterPayload>
  timestamp: Date
  raw: EmsDataPayload
}
