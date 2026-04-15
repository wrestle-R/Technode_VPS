# EMS MQTT Test

Publish fake EMS snapshots from the repo root with Python.

Install the MQTT dependency once:

```bash
pip install -r test/ems/requirements.txt
```

Run the publisher:

```bash
./test/ems/run_ems_publisher.sh
```

Run direct DB injection (no MQTT):

```bash
PRISMA_DATABASE_URL="postgresql://user:pass@localhost:5432/dbname" ./test/ems/run_ems_db_injection.sh
```

Optional environment variables:

```bash
EMS_TEST_BROKER_HOST=localhost
EMS_TEST_BROKER_PORT=1883
EMS_TEST_UNIT_ID=TN-862360078027385
EMS_TEST_STATUS_TOPIC=/TN-862360078027385/status
EMS_TEST_DATA_TOPIC=/TN-862360078027385/data
EMS_TEST_INTERVAL_SECONDS=10
EMS_TEST_MAX_MESSAGES=1 ./test/ems/run_ems_publisher.sh
```

Optional DB injection variables:

```bash
EMS_DB_URL=postgresql://user:pass@localhost:5432/dbname
EMS_INJECT_UNIT_ID=TN-862360078027385
EMS_INJECT_HOURS=25
EMS_INJECT_RECORDS_PER_HOUR=30
EMS_INJECT_SLAVE_COUNT=2
EMS_INJECT_LOCATION=INDIA
EMS_INJECT_DEVICE_TYPE="4G IOT GATEWAY"
EMS_INJECT_TOPIC=/TN-862360078027385/data
./test/ems/run_ems_db_injection.sh
```

Defaults:

- connects automatically to `localhost:1883`
- publishes status to `/{UNIT_ID}/status` (retained + LWT)
- publishes telemetry to `/{UNIT_ID}/data`
- sends exactly `2` slaves in every payload
- publishes every `10` seconds
- creates and reuses `test/ems/.venv`

Status payloads used by the fake device:

```json
{"ID":"TN-862360078027385","state":"online","ts":"2026-04-15T12:34:56Z"}
```

```json
{"ID":"TN-862360078027385","state":"offline","reason":"lwt","ts":"2026-04-15T12:35:30Z"}
```

Run the worker from `next/`:

```bash
npm run ems:mqtt
```
