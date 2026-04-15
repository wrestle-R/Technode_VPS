export type EmsFieldTemplateEntry = {
  index: number
  key: string
  label: string
  visible: boolean
  order: number
}

export type EmsRtuOverride = {
  nickname?: string
  fieldTemplate?: EmsFieldTemplateEntry[]
}

export type EmsRtuOverrides = Record<string, EmsRtuOverride>

export type EmsRtuPayload = {
  id?: number
  slave?: string
  nickname?: string
  res?: string
  data?: number[]
  datalen?: number
}

export type EmsPayload = {
  ID?: string
  Status?: string
  Signal?: number
  Location?: string
  RTU?: EmsRtuPayload[]
  TS?: string
  DT?: string
}

export type EmsStatusPayload = {
  ID?: string
  state?: string
  Status?: string
  reason?: string
  ts?: string
  TS?: string
}

export type MappedRtuEntry = {
  id: number | null
  slave: string | null
  nickname: string
  res: string | null
  datalen: number
  metrics: Record<string, number | null>
}
