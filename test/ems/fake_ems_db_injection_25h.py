#!/usr/bin/env python3

import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import psycopg
from psycopg.types.json import Json


DATABASE_URL = os.getenv("EMS_DB_URL") or os.getenv("PRISMA_DATABASE_URL")
UNIT_ID = os.getenv("EMS_INJECT_UNIT_ID", "TN-862360078027385")
HOURS = int(os.getenv("EMS_INJECT_HOURS", "25"))
RECORDS_PER_HOUR = int(os.getenv("EMS_INJECT_RECORDS_PER_HOUR", "30"))
SLAVE_COUNT = int(os.getenv("EMS_INJECT_SLAVE_COUNT", "2"))
LOCATION = os.getenv("EMS_INJECT_LOCATION", "INDIA")
DEVICE_TYPE = os.getenv("EMS_INJECT_DEVICE_TYPE", "4G IOT GATEWAY")
TOPIC = os.getenv("EMS_INJECT_TOPIC", f"/{UNIT_ID}/data")

DEFAULT_KEYS = [
    "VRN",
    "VYN",
    "VBN",
    "VRY",
    "VYB",
    "VBR",
    "IR",
    "IY",
    "IB",
    "KW-R",
    "KW-Y",
    "KW-B",
    "PF-R",
    "PF-Y",
    "PF-B",
    "Freq",
    "Kwh",
    "KvAh",
    "KvArh",
]

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


def build_default_field_template():
    return [
        {
            "index": index,
            "key": key,
            "label": key,
            "visible": True,
            "order": index,
        }
        for index, key in enumerate(DEFAULT_KEYS)
    ]


def fluctuate(value: float) -> float:
    factor = 1 + random.uniform(-0.08, 0.08)
    return round(value * factor, 2)


def build_rtus():
    rtus = []
    for index in range(SLAVE_COUNT):
        data = [fluctuate(value) for value in BASE_METRICS]
        rtus.append(
            {
                "id": index + 1,
                "slave": f"METER-{index + 1}",
                "res": "OK",
                "data": data,
                "datalen": len(data),
            }
        )
    return rtus


def map_rtu_array(raw_rtu_array):
    mapped = []
    for rtu in raw_rtu_array:
        metrics = {}
        data = rtu.get("data", [])

        for index, key in enumerate(DEFAULT_KEYS):
            value = (
                data[index]
                if index < len(data) and isinstance(data[index], (int, float))
                else None
            )
            metrics[key] = value

        mapped.append(
            {
                "id": rtu.get("id") if isinstance(rtu.get("id"), int) else None,
                "slave": rtu.get("slave") or None,
                "nickname": rtu.get("slave") or f"RTU-{rtu.get('id', 'unknown')}",
                "res": rtu.get("res") or None,
                "datalen": rtu.get("datalen")
                if isinstance(rtu.get("datalen"), int)
                else len(data),
                "metrics": metrics,
            }
        )

    return mapped


def ensure_valid_config() -> None:
    if not DATABASE_URL:
        print(
            "[inject] missing database URL; set PRISMA_DATABASE_URL or EMS_DB_URL",
            file=sys.stderr,
        )
        raise SystemExit(1)

    if HOURS <= 0:
        print("[inject] EMS_INJECT_HOURS must be greater than 0", file=sys.stderr)
        raise SystemExit(1)

    if RECORDS_PER_HOUR <= 0:
        print(
            "[inject] EMS_INJECT_RECORDS_PER_HOUR must be greater than 0",
            file=sys.stderr,
        )
        raise SystemExit(1)

    if SLAVE_COUNT <= 0:
        print("[inject] EMS_INJECT_SLAVE_COUNT must be greater than 0", file=sys.stderr)
        raise SystemExit(1)


def normalize_database_url(url: str) -> str:
    parsed = urlparse(url)
    params = parse_qsl(parsed.query, keep_blank_values=True)

    schema = None
    filtered = []
    for key, value in params:
        if key == "schema":
            schema = value
            continue
        filtered.append((key, value))

    if schema:
        filtered.append(("options", f"-csearch_path={schema}"))

    return urlunparse(parsed._replace(query=urlencode(filtered)))


def main() -> int:
    ensure_valid_config()
    db_url = DATABASE_URL
    if db_url is None:
        print("[inject] missing database URL", file=sys.stderr)
        return 1

    total_records = HOURS * RECORDS_PER_HOUR
    step_seconds = int(3600 / RECORDS_PER_HOUR)
    end_time = datetime.now(timezone.utc).replace(microsecond=0)
    start_time = end_time - timedelta(hours=HOURS)

    print(
        f"[inject] preparing {total_records} records for {UNIT_ID} "
        f"({HOURS}h, {RECORDS_PER_HOUR}/hour)"
    )

    normalized_database_url = normalize_database_url(db_url)

    with psycopg.connect(normalized_database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ems_units (
                    unit_id,
                    customer_id,
                    location_label,
                    device_type,
                    last_seen_at,
                    topic_path,
                    unit_field_template,
                    rtu_overrides,
                    scaling_factor,
                    updated_at
                )
                VALUES (%s, NULL, %s, %s, %s, %s, %s::jsonb, %s::jsonb, 1, NOW())
                ON CONFLICT (unit_id)
                DO UPDATE SET
                    location_label = EXCLUDED.location_label,
                    device_type = EXCLUDED.device_type,
                    last_seen_at = EXCLUDED.last_seen_at,
                    topic_path = EXCLUDED.topic_path,
                    updated_at = NOW()
                RETURNING id
                """,
                (
                    UNIT_ID,
                    LOCATION,
                    DEVICE_TYPE,
                    end_time,
                    TOPIC,
                    json.dumps(build_default_field_template()),
                    json.dumps({}),
                ),
            )
            row = cur.fetchone()
            if row is None:
                print("[inject] failed to upsert EMS unit", file=sys.stderr)
                return 1
            unit_db_id = row[0]

            rows = []
            for index in range(total_records):
                ts = start_time + timedelta(seconds=index * step_seconds)
                timestamp_str = ts.astimezone(timezone.utc).strftime(
                    "%Y-%m-%dT%H:%M:%S"
                )
                raw_rtu_array = build_rtus()
                raw_unit_payload = {
                    "ID": UNIT_ID,
                    "Signal": random.randint(45, 85),
                    "Location": LOCATION,
                    "RTU": raw_rtu_array,
                    "TS": timestamp_str,
                    "DT": DEVICE_TYPE,
                }
                mapped_rtu_array = map_rtu_array(raw_rtu_array)

                rows.append(
                    (
                        unit_db_id,
                        ts,
                        Json(raw_unit_payload),
                        Json(raw_rtu_array),
                        Json(mapped_rtu_array),
                    )
                )

            cur.executemany(
                """
                INSERT INTO ems_logs (
                    ems_unit_id,
                    device_timestamp,
                    raw_unit_payload,
                    raw_rtu_array,
                    mapped_rtu_array
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                rows,
            )

        conn.commit()

    print(f"[inject] inserted {total_records} rows into ems_logs for {UNIT_ID}")
    print(f"[inject] range: {start_time.isoformat()} -> {end_time.isoformat()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
