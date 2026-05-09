# EMS MQTT Protocol (Technode VPS)

## Scope
This document defines the EMS MQTT contract used by `next/scripts/ems-mqtt-worker.ts` and the EMS dashboards/APIs.

## Topics
- Connection: `/{id}/connection`
- Data: `/{id}/data`

The worker subscribes to both slash and non-slash variants:
- `+/connection`
- `/+/connection`
- `+/data`
- `/+/data`

## Device ID Rules
- `ID` is required in payloads.
- `ID` must be numeric only (`^[0-9]+$`).
- Topic unit id and payload `ID` must match exactly.
- IDs are stored exactly as numeric strings (no `TN-` prefix transformation).

## Connection Payload
Example online payload:

```json
{
  "ID": "862360079818097",
  "MODEL": "TIG5 [4G RS485 IOT GATEWAY]",
  "Status": "Online",
  "Signal": 74,
  "Location": "INDIA",
  "TS": "1778355673",
  "DT": "2026-05-09 19:41:13"
}
```

Example offline payload (LWT style):

```json
{
  "ID": "862360079818097",
  "MODEL": "TIG5 [4G RS485 IOT GATEWAY]",
  "Status": "Offline",
  "Signal": 74,
  "Location": "INDIA",
  "TS": "1778355673",
  "DT": "2026-05-09 19:41:13"
}
```

### Status Mapping
- `Status: Online` => unit status `Online`
- `Status: Offline` => unit status `Offline`
- Connection status is the authoritative online/offline signal.

## Data Payload
Example telemetry payload:

```json
{
  "ID": "862360079818097",
  "Status": "Online",
  "Signal": 70,
  "Location": "INDIA",
  "data": {
    "1": {
      "name": "MFM-1",
      "VRN": 251.5,
      "VYN": 253.34,
      "VBN": 243.89,
      "VRY": 433.89,
      "VYB": 433.26,
      "VBR": 430.51,
      "IR": 0,
      "IY": 0,
      "IB": 0,
      "KW-R": 0,
      "KW-Y": 0,
      "KW-B": 0,
      "PF-R": 1,
      "PF-Y": 1,
      "PF-B": 1,
      "Freq": 50.31,
      "Kwh": 0,
      "KvAh": 0,
      "KvArh": 0
    }
  },
  "TS": "1778356802",
  "DT": "2026-05-09 20:00:02"
}
```

### Meter Model
- `data` is a dynamic object map.
- Each key (`"1"`, `"2"`, ...) is a meter key.
- Each meter object contains metrics as key-value pairs.
- No RTU array mapping is used.
- No scaling transform is applied.

## Timestamp Behavior
Timestamp is resolved in this order:
1. `TS`
2. `DT`
3. server receive time (`now`) fallback

If `TS` is numeric, it is treated as:
- milliseconds when length >= 13
- seconds otherwise

## Strict Key Behavior
- Only ASCII `Location` key is parsed.
- Unicode variants (for example `LocaƟon`) are not parsed.

## Rejected Payload Cases
The worker rejects and logs errors for:
- non-JSON payloads
- missing `ID`
- non-numeric `ID`
- topic `id` mismatch with payload `ID`
- connection payload with invalid/missing `Status`
- data payload with missing or invalid `data` map
