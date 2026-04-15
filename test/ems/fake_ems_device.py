#!/usr/bin/env python3

import json
import os
import random
import signal
import sys
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt


BROKER_HOST = os.getenv("EMS_TEST_BROKER_HOST", "localhost")
BROKER_PORT = int(os.getenv("EMS_TEST_BROKER_PORT", "1883"))
UNIT_ID = os.getenv("EMS_TEST_UNIT_ID", "TN-862360078027385")
STATUS_TOPIC = os.getenv("EMS_TEST_STATUS_TOPIC", f"/{UNIT_ID}/status")
DATA_TOPIC = os.getenv("EMS_TEST_DATA_TOPIC", f"/{UNIT_ID}/data")
PUBLISH_INTERVAL_SECONDS = int(os.getenv("EMS_TEST_INTERVAL_SECONDS", "10"))
MAX_MESSAGES = int(os.getenv("EMS_TEST_MAX_MESSAGES", "0"))
SLAVE_COUNT = 2

BASE_METRICS = [
    238,
    237.8,
    236.4,
    412.1,
    410.7,
    410.8,
    103.85,
    119.75,
    99.95,
    25.02,
    28.51,
    23.62,
    1,
    1,
    1,
    50,
    28.32,
    1.48,
    28.38,
]


def fluctuate(value: float) -> float:
    factor = 1 + random.uniform(-0.4, 0.4)
    return round(value * factor, 2)


def build_payload() -> dict:
    rtus = []
    for index in range(SLAVE_COUNT):
        rtus.append(
            {
                "id": index + 1,
                "slave": f"METER-{index + 1}",
                "res": "OK",
                "data": [fluctuate(value) for value in BASE_METRICS],
                "datalen": len(BASE_METRICS),
            }
        )

    return {
        "ID": UNIT_ID,
        "Signal": random.randint(40, 80),
        "Location": "INDIA",
        "RTU": rtus,
        "TS": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "DT": "4G IOT GATEWAY",
    }


def build_status_payload(state: str, reason: str | None = None) -> dict:
    payload = {
        "ID": UNIT_ID,
        "state": state,
        "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    if reason:
        payload["reason"] = reason
    return payload


def main() -> int:
    client_id = f"technode-test-{random.randint(1000, 9999)}"
    callback_api_version = getattr(
        getattr(mqtt, "CallbackAPIVersion", object), "VERSION2", None
    )
    client_kwargs = {
        "client_id": client_id,
        "protocol": mqtt.MQTTv311,
    }
    if callback_api_version is not None:
        client_kwargs["callback_api_version"] = callback_api_version

    client = mqtt.Client(**client_kwargs)
    client.will_set(
        STATUS_TOPIC,
        payload=json.dumps(build_status_payload("offline", "lwt")),
        qos=1,
        retain=True,
    )

    def handle_connect(_client, _userdata, _flags, reason_code, _properties=None):
        if reason_code == 0:
            print(f"[test] connected to {BROKER_HOST}:{BROKER_PORT} as {client_id}")
            status_result = client.publish(
                STATUS_TOPIC,
                json.dumps(build_status_payload("online", "connect")),
                qos=1,
                retain=True,
            )
            if status_result.rc != mqtt.MQTT_ERR_SUCCESS:
                print(f"[test] initial status publish failed: {status_result.rc}", file=sys.stderr)
            print(
                f"[test] publishing status to {STATUS_TOPIC} and data to {DATA_TOPIC} every {PUBLISH_INTERVAL_SECONDS}s"
            )
        else:
            print(f"[test] mqtt connection failed: {reason_code}", file=sys.stderr)

    def handle_disconnect(_client, _userdata, reason_code, _properties=None):
        print(f"[test] disconnected: {reason_code}")

    client.on_connect = handle_connect
    client.on_disconnect = handle_disconnect

    def shutdown(_signum=None, _frame=None):
        try:
            offline_result = client.publish(
                STATUS_TOPIC,
                json.dumps(build_status_payload("offline", "shutdown")),
                qos=1,
                retain=True,
            )
            offline_result.wait_for_publish()
            client.loop_stop()
            client.disconnect()
        finally:
            sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
    client.loop_start()

    published_count = 0

    while True:
        status_payload = build_status_payload("online", "heartbeat")
        status_result = client.publish(
            STATUS_TOPIC,
            json.dumps(status_payload),
            qos=1,
            retain=True,
        )
        status_result.wait_for_publish()

        payload = build_payload()
        result = client.publish(DATA_TOPIC, json.dumps(payload), qos=1, retain=False)
        result.wait_for_publish()

        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            print(
                f"[test] published {payload['ID']} with {len(payload['RTU'])} slaves at {payload['TS']}"
            )
        else:
            print(f"[test] publish failed: {result.rc}", file=sys.stderr)

        published_count += 1
        if MAX_MESSAGES > 0 and published_count >= MAX_MESSAGES:
            shutdown()

        time.sleep(PUBLISH_INTERVAL_SECONDS)


if __name__ == "__main__":
    raise SystemExit(main())
