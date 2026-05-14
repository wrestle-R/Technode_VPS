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
UNIT_ID = os.getenv("EMS_TEST_UNIT_ID", "862360079818095")
CONNECTION_TOPIC = os.getenv("EMS_TEST_CONNECTION_TOPIC", f"/{UNIT_ID}/connection")
DATA_TOPIC = os.getenv("EMS_TEST_DATA_TOPIC", f"/{UNIT_ID}/data")
PUBLISH_INTERVAL_SECONDS = int(os.getenv("EMS_TEST_INTERVAL_SECONDS", "10"))
MAX_MESSAGES = int(os.getenv("EMS_TEST_MAX_MESSAGES", "0"))
METER_COUNT = int(os.getenv("EMS_TEST_METER_COUNT", "2"))


def must_be_numeric_unit_id(unit_id: str) -> None:
    if not unit_id.isdigit():
        print(f"[test] invalid UNIT_ID={unit_id}. must be numeric only", file=sys.stderr)
        raise SystemExit(1)


def now_epoch_seconds_str() -> str:
    return str(int(datetime.now(timezone.utc).timestamp()))


def now_local_dt() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def fluctuate(value: float, spread: float = 0.08) -> float:
    return round(value * (1 + random.uniform(-spread, spread)), 3)


def build_meter_payload(meter_index: int) -> dict:
    base_vrn = 250 + meter_index
    base_vyn = 252 + meter_index
    base_vbn = 244 + meter_index

    return {
        "name": f"MFM-{meter_index + 1}",
        "VRN": fluctuate(base_vrn),
        "VYN": fluctuate(base_vyn),
        "VBN": fluctuate(base_vbn),
        "VRY": fluctuate(433),
        "VYB": fluctuate(433),
        "VBR": fluctuate(431),
        "IR": fluctuate(12.4, 0.2),
        "IY": fluctuate(11.8, 0.2),
        "IB": fluctuate(12.1, 0.2),
        "KW-R": fluctuate(2.8, 0.25),
        "KW-Y": fluctuate(2.9, 0.25),
        "KW-B": fluctuate(2.7, 0.25),
        "PF-R": round(random.uniform(0.95, 1.0), 3),
        "PF-Y": round(random.uniform(0.95, 1.0), 3),
        "PF-B": round(random.uniform(0.95, 1.0), 3),
        "Freq": fluctuate(50.0, 0.01),
        "Kwh": round(1000 + random.uniform(0, 30), 3),
        "KvAh": round(1000 + random.uniform(0, 30), 3),
        "KvArh": round(100 + random.uniform(0, 10), 3),
    }


def build_data_payload() -> dict:
    meters = {}
    for idx in range(METER_COUNT):
        meter_key = str(idx + 1)
        meters[meter_key] = build_meter_payload(idx)

    return {
        "ID": UNIT_ID,
        "Status": "Online",
        "Signal": random.randint(45, 85),
        "Location": "INDIA",
        "data": meters,
        "TS": now_epoch_seconds_str(),
        "DT": now_local_dt(),
    }


def build_connection_payload(status: str) -> dict:
    return {
        "ID": UNIT_ID,
        "MODEL": "TIG5 [4G RS485 IOT GATEWAY]",
        "Status": status,
        "Signal": random.randint(45, 85),
        "Location": "INDIA",
        "TS": now_epoch_seconds_str(),
        "DT": now_local_dt(),
    }


def main() -> int:
    must_be_numeric_unit_id(UNIT_ID)

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
        CONNECTION_TOPIC,
        payload=json.dumps(build_connection_payload("Offline")),
        qos=1,
        retain=True,
    )

    def on_connect(_client, _userdata, _flags, reason_code, _properties=None):
        if reason_code == 0:
            print(f"[test] connected to {BROKER_HOST}:{BROKER_PORT} as {client_id}")
            result = client.publish(
                CONNECTION_TOPIC,
                json.dumps(build_connection_payload("Online")),
                qos=1,
                retain=True,
            )
            if result.rc != mqtt.MQTT_ERR_SUCCESS:
                print(f"[test] initial connection publish failed: {result.rc}", file=sys.stderr)
            print(
                f"[test] publishing connection to {CONNECTION_TOPIC} and data to {DATA_TOPIC} every {PUBLISH_INTERVAL_SECONDS}s"
            )
        else:
            print(f"[test] mqtt connection failed: {reason_code}", file=sys.stderr)

    def on_disconnect(_client, _userdata, reason_code, _properties=None):
        print(f"[test] disconnected: {reason_code}")

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect

    def shutdown(_signum=None, _frame=None):
        try:
            offline_result = client.publish(
                CONNECTION_TOPIC,
                json.dumps(build_connection_payload("Offline")),
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
        connection_payload = build_connection_payload("Online")
        status_result = client.publish(
            CONNECTION_TOPIC,
            json.dumps(connection_payload),
            qos=1,
            retain=True,
        )
        status_result.wait_for_publish()

        data_payload = build_data_payload()
        data_result = client.publish(DATA_TOPIC, json.dumps(data_payload), qos=1, retain=False)
        data_result.wait_for_publish()

        if data_result.rc == mqtt.MQTT_ERR_SUCCESS:
            print(
                f"[test] published {data_payload['ID']} with {len(data_payload['data'])} meters at {data_payload['DT']}"
            )
        else:
            print(f"[test] publish failed: {data_result.rc}", file=sys.stderr)

        published_count += 1
        if MAX_MESSAGES > 0 and published_count >= MAX_MESSAGES:
            shutdown()

        time.sleep(PUBLISH_INTERVAL_SECONDS)


if __name__ == "__main__":
    raise SystemExit(main())
