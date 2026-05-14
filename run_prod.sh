#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NEXT_DIR="${ROOT_DIR}/next"
EMS_PROD_DIR="${ROOT_DIR}/test/ems/prod"
PROD_PORT=5000

PIDS=()

cleanup() {
  if ((${#PIDS[@]})); then
    echo
    echo "[run_prod] stopping background processes..."
    kill "${PIDS[@]}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

start_background() {
  local name="$1"
  local tag="$2"
  shift
  shift

  echo "[run_prod] starting ${name}"
  "$@" 2>&1 | sed -u "s/^/[${tag}] /" &
  PIDS+=("$!")
}

start_next_prod_server() {
  cd "${NEXT_DIR}"
  echo "[run_prod] building Next app"
  npm run build
  echo "[run_prod] starting Next app on port ${PROD_PORT}"
  PORT="${PROD_PORT}" npm run start
}

start_ems_mqtt_worker() {
  cd "${NEXT_DIR}"
  npm run ems:mqtt
}

start_ems_test_publisher() {
  cd "${EMS_PROD_DIR}"
  EMS_TEST_BROKER_HOST="${EMS_TEST_BROKER_HOST:-127.0.0.1}" \
    EMS_TEST_BROKER_PORT="${EMS_TEST_BROKER_PORT:-1883}" \
    ./run-mqtt.sh
}

if [[ ! -d "${NEXT_DIR}" ]]; then
  echo "[run_prod] missing next directory: ${NEXT_DIR}" >&2
  exit 1
fi

if [[ ! -x "${EMS_PROD_DIR}/run-mqtt.sh" ]]; then
  echo "[run_prod] missing executable EMS script: ${EMS_PROD_DIR}/run-mqtt.sh" >&2
  exit 1
fi

start_background "Next production server" "next:prod" start_next_prod_server

echo "[run_prod] production server target port: ${PROD_PORT}"
echo "[run_prod] docker containers:"
docker ps

echo "[run_prod] starting mosquitto container"
docker start mosquitto

start_background "EMS MQTT worker" "ems:mqtt" start_ems_mqtt_worker
start_background "EMS MQTT publisher" "ems:prod-device" start_ems_test_publisher

wait "${PIDS[@]}"
