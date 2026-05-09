import assert from "node:assert/strict"
import test from "node:test"

import {
  parseDataPayload,
  parseIncomingPayload,
  parseTopicMessageType,
  parseTopicUnitId,
  parseConnectionPayload,
} from "@/lib/ems/service"

test("topic parsing supports connection and data topics", () => {
  assert.equal(parseTopicUnitId("862360079818097/connection"), "862360079818097")
  assert.equal(parseTopicMessageType("862360079818097/connection"), "connection")
  assert.equal(parseTopicMessageType("/862360079818097/data"), "data")
})

test("parseIncomingPayload returns object", () => {
  const payload = parseIncomingPayload('{"ID":"862360079818097","Status":"Online"}')
  assert.equal(typeof payload, "object")
})

test("parseConnectionPayload accepts numeric ID and online/offline status", () => {
  const online = parseConnectionPayload({
    ID: "862360079818097",
    Status: "Online",
    Location: "INDIA",
    TS: "1778355673",
    DT: "2026-05-09 19:41:13",
  })
  assert.equal(online.id, "862360079818097")
  assert.equal(online.state, "online")

  const offline = parseConnectionPayload({
    ID: "862360079818097",
    Status: "Offline",
    TS: "1778355673",
  })
  assert.equal(offline.state, "offline")
})

test("parseConnectionPayload rejects non numeric ID", () => {
  assert.throws(
    () =>
      parseConnectionPayload({
        ID: "TN-862360079818097",
        Status: "Online",
      }),
    /numeric/i
  )
})

test("parseDataPayload accepts meter map payload", () => {
  const payload = parseDataPayload({
    ID: "862360079818097",
    Status: "Online",
    Signal: 70,
    Location: "INDIA",
    data: {
      "1": {
        name: "MFM-1",
        VRN: 251.5,
        VYN: 253.34,
        VBN: 243.89,
        VRY: 433.89,
      },
    },
    TS: "1778356802",
    DT: "2026-05-09 20:00:02",
  })

  assert.equal(payload.id, "862360079818097")
  assert.equal(typeof payload.meters, "object")
  assert.equal((payload.meters["1"] as { name?: string })?.name, "MFM-1")
})

test("parseDataPayload rejects missing meter map", () => {
  assert.throws(
    () =>
      parseDataPayload({
        ID: "862360079818097",
        Status: "Online",
        TS: "1778356802",
      }),
    /data/i
  )
})

test("parseDataPayload only accepts ASCII Location key", () => {
  const payload = parseDataPayload({
    ID: "862360079818097",
    Status: "Online",
    Location: "INDIA",
    data: {
      "1": {
        name: "MFM-1",
      },
    },
    TS: "1778356802",
  })

  assert.equal(payload.location, "INDIA")

  const payloadWithUnicodeLikeKey = parseDataPayload({
    ID: "862360079818097",
    Status: "Online",
    ["LocaƟon"]: "INDIA",
    data: {
      "1": {
        name: "MFM-1",
      },
    },
    TS: "1778356802",
  })

  assert.equal(payloadWithUnicodeLikeKey.location, null)
})
