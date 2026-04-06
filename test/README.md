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

Optional environment variables:

```bash
EMS_TEST_BROKER_HOST=broker.hivemq.com
EMS_TEST_BROKER_PORT=1883
EMS_TEST_UNIT_ID=TN-862360078027385
EMS_TEST_TOPIC=/TN-862360078027385/ems
EMS_TEST_INTERVAL_SECONDS=10
EMS_TEST_MAX_MESSAGES=1 ./test/ems/run_ems_publisher.sh
```

Defaults:

- connects automatically to `broker.hivemq.com:1883`
- publishes to `/{UNIT_ID}/ems`
- sends exactly `2` slaves in every payload
- publishes every `10` seconds
- creates and reuses `test/ems/.venv`

Run the worker from `next/`:

```bash
npm run ems:mqtt
```
