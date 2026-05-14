#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_RUNNER="${SCRIPT_DIR}/../run_mqtt.sh"

if [[ ! -x "${BASE_RUNNER}" ]]; then
  echo "[ems:prod] base runner not found or not executable: ${BASE_RUNNER}" >&2
  exit 1
fi

# Default to VPS MQTT endpoint; callers can still override via env.
export EMS_TEST_BROKER_HOST="${EMS_TEST_BROKER_HOST:-195.35.22.74}"
export EMS_TEST_BROKER_PORT="${EMS_TEST_BROKER_PORT:-1883}"

exec "${BASE_RUNNER}"
