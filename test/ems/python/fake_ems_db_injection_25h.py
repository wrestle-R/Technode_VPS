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
UNIT_ID = os.getenv("EMS_INJECT_UNIT_ID", "862360079818097")
HOURS = int(os.getenv("EMS_INJECT_HOURS", "25"))
RECORDS_PER_HOUR = int(os.getenv("EMS_INJECT_RECORDS_PER_HOUR", "30"))
METER_COUNT = int(os.getenv("EMS_INJECT_METER_COUNT", "2"))
LOCATION = os.getenv("EMS_INJECT_LOCATION", "INDIA")
MODEL = os.getenv("EMS_INJECT_MODEL", "TIG5 [4G RS485 IOT GATEWAY]")
CONNECTION_TOPIC = os.getenv("EMS_INJECT_CONNECTION_TOPIC", f"/{UNIT_ID}/connection")
DATA_TOPIC = os.getenv("EMS_INJECT_DATA_TOPIC", f"/{UNIT_ID}/data")


def ensure_valid_config() -> None:
    if not DATABASE_URL:
        print("[inject] missing database URL; set PRISMA_DATABASE_URL or EMS_DB_URL", file=sys.stderr)
        raise SystemExit(1)

    if not UNIT_ID.isdigit():
        print("[inject] EMS_INJECT_UNIT_ID must be numeric only", file=sys.stderr)
        raise SystemExit(1)

    if HOURS <= 0 or RECORDS_PER_HOUR <= 0 or METER_COUNT <= 0:
        print("[inject] HOURS, RECORDS_PER_HOUR, and METER_COUNT must be > 0", file=sys.stderr)
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


def build_meter_map() -> dict:
    meters = {}
    for idx in range(METER_COUNT):
        meters[str(idx + 1)] = build_meter_payload(idx)
    return meters


def build_data_payload(ts: datetime) -> dict:
    return {
        "ID": UNIT_ID,
        "Status": "Online",
        "Signal": random.randint(45, 85),
        "Location": LOCATION,
        "data": build_meter_map(),
        "TS": str(int(ts.timestamp())),
        "DT": ts.astimezone().strftime("%Y-%m-%d %H:%M:%S"),
    }


def build_connection_payload(ts: datetime, status: str) -> dict:
    return {
        "ID": UNIT_ID,
        "MODEL": MODEL,
        "Status": status,
        "Signal": random.randint(45, 85),
        "Location": LOCATION,
        "TS": str(int(ts.timestamp())),
        "DT": ts.astimezone().strftime("%Y-%m-%d %H:%M:%S"),
    }


def main() -> int:
    ensure_valid_config()

    total_records = HOURS * RECORDS_PER_HOUR
    step_seconds = int(3600 / RECORDS_PER_HOUR)
    end_time = datetime.now(timezone.utc).replace(microsecond=0)
    start_time = end_time - timedelta(hours=HOURS)

    print(
        f"[inject] preparing {total_records} data rows for {UNIT_ID} "
        f"({HOURS}h, {RECORDS_PER_HOUR}/hour, {METER_COUNT} meters)"
    )

    normalized_database_url = normalize_database_url(DATABASE_URL)

    with psycopg.connect(normalized_database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ems_units (
                    unit_id,
                    customer_id,
                    location_label,
                    device_type,
                    topic_path,
                    last_seen_at,
                    last_status,
                    updated_at
                )
                VALUES (%s, NULL, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (unit_id)
                DO UPDATE SET
                    location_label = EXCLUDED.location_label,
                    device_type = EXCLUDED.device_type,
                    topic_path = EXCLUDED.topic_path,
                    last_seen_at = EXCLUDED.last_seen_at,
                    last_status = EXCLUDED.last_status,
                    updated_at = NOW()
                RETURNING id
                """,
                (
                    UNIT_ID,
                    LOCATION,
                    MODEL,
                    DATA_TOPIC,
                    end_time,
                    "Online",
                ),
            )
            row = cur.fetchone()
            if row is None:
                print("[inject] failed to upsert EMS unit", file=sys.stderr)
                return 1

            unit_db_id = row[0]
            rows = []

            connection_start_payload = build_connection_payload(start_time, "Online")
            rows.append(
                (
                    unit_db_id,
                    "connection",
                    "online",
                    start_time,
                    Json(connection_start_payload),
                    Json({}),
                )
            )

            for index in range(total_records):
                ts = start_time + timedelta(seconds=index * step_seconds)
                raw_payload = build_data_payload(ts)
                rows.append(
                    (
                        unit_db_id,
                        "data",
                        "online",
                        ts,
                        Json(raw_payload),
                        Json(raw_payload["data"]),
                    )
                )

            connection_end_payload = build_connection_payload(end_time, "Online")
            rows.append(
                (
                    unit_db_id,
                    "connection",
                    "online",
                    end_time,
                    Json(connection_end_payload),
                    Json({}),
                )
            )

            cur.executemany(
                """
                INSERT INTO ems_logs (
                    ems_unit_id,
                    message_type,
                    status_value,
                    device_timestamp,
                    raw_payload,
                    meter_payload
                )
                VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb)
                """,
                rows,
            )

        conn.commit()

    print(
        f"[inject] inserted {total_records} data rows (+2 connection rows) for unit {UNIT_ID}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
