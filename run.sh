#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NEXT_DIR="${ROOT_DIR}/next"
EMS_DIR="${ROOT_DIR}/test/ems"

PIDS=()

cleanup() {
  if ((${#PIDS[@]})); then
    echo
    echo "[run] stopping background processes..."
    kill "${PIDS[@]}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

start_background() {
  local name="$1"
  local tag="$2"
  shift
  shift

  echo "[run] starting ${name}"
  "$@" 2>&1 | sed -u "s/^/[${tag}] /" &
  PIDS+=("$!")
}

start_next_server() {
  cd "${NEXT_DIR}"
  npm run dev
}

start_ems_mqtt_worker() {
  cd "${NEXT_DIR}"
  npm run ems:mqtt
}

if [[ ! -d "${NEXT_DIR}" ]]; then
  echo "[run] missing next directory: ${NEXT_DIR}" >&2
  exit 1
fi

if [[ ! -x "${EMS_DIR}/run_mqtt.sh" ]]; then
  echo "[run] missing executable EMS script: ${EMS_DIR}/run_mqtt.sh" >&2
  exit 1
fi

start_background "Next server" "next" start_next_server

echo "[run] docker containers:"
docker ps

echo "[run] starting mosquitto container"
docker start mosquitto

start_background "EMS MQTT worker" "ems:mqtt" start_ems_mqtt_worker

echo "[run] starting EMS MQTT publisher"
cd "${EMS_DIR}"
./run_mqtt.sh 2>&1 | sed -u 's/^/[ems-testdevice] /'
