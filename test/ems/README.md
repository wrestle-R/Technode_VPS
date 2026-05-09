# Local EMS Test Guide

This folder has two local test flows for the updated EMS contract:
- MQTT publisher flow (simulates live gateway messages)
- Direct DB injection flow (seeds historical logs)

Layout:
- `run_mqtt.sh` and `run_db_injection.sh` are the only top-level runners.
- Python assets live in `test/ems/python/`.

## Contract used
- Connection topic: `/{id}/connection`
- Data topic: `/{id}/data`
- ID must be numeric only (no `TN-` prefix)

## 1) MQTT publisher flow (live)

### Start app-side MQTT worker
From `next/`:

```bash
npm run ems:mqtt
```

### Start local publisher
From repo root:

```bash
./test/ems/run_mqtt.sh
```

### Useful env overrides

```bash
EMS_TEST_UNIT_ID=862360079818097 \
EMS_TEST_BROKER_HOST=localhost \
EMS_TEST_BROKER_PORT=1883 \
EMS_TEST_INTERVAL_SECONDS=10 \
./test/ems/run_mqtt.sh
```

## 2) Direct DB injection flow (historical data)

From repo root:

```bash
PRISMA_DATABASE_URL='postgresql://...' ./test/ems/run_db_injection.sh
```

### Useful env overrides

```bash
EMS_INJECT_UNIT_ID=862360079818097 \
EMS_INJECT_HOURS=25 \
EMS_INJECT_RECORDS_PER_HOUR=30 \
EMS_INJECT_METER_COUNT=2 \
PRISMA_DATABASE_URL='postgresql://...' \
./test/ems/run_db_injection.sh
```

## Manual endpoint checks (root test flow)

After data exists, verify these routes while logged in as customer:

```bash
curl -s 'http://localhost:3000/api/customer/ems'
curl -s 'http://localhost:3000/api/customer/ems/862360079818097'
curl -s 'http://localhost:3000/api/customer/ems/862360079818097/summary?range=7d&meterKey=1'
curl -s 'http://localhost:3000/api/customer/ems/862360079818097/current-hourly?meterKey=1'
curl -s 'http://localhost:3000/api/customer/ems/862360079818097/voltage-hourly?meterKey=1'
curl -s 'http://localhost:3000/api/customer/ems/862360079818097/energy-analytics?meterKey=1&dailyRange=30d'
curl -s 'http://localhost:3000/api/customer/ems/862360079818097/reports/count?meterKey=1&reportRange=7d'
```

Report exports:

```bash
curl -L -o report.csv 'http://localhost:3000/api/customer/ems/862360079818097/reports/csv?meterKey=1&reportRange=7d'
curl -L -o report.pdf 'http://localhost:3000/api/customer/ems/862360079818097/reports/pdf?meterKey=1&reportType=raw&reportRange=7d'
```

## What to validate in UI
- Admin docs page: `/admin/docs/ems`
- Admin device list/details: meter counts, no RTU/scaling controls
- Customer device list + unit tabs (charts/logs/reports)
- Meter selector works with keys from `data` payload
- Online/offline reflects connection payload status
