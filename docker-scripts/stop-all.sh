#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/common.sh"

require_docker

stop_if_running() {
  local name="$1"
  if container_running "$name"; then
    log "Stopping container: $name"
    docker stop "$name" >/dev/null
  else
    log "Container already stopped or missing: $name"
  fi
}

stop_if_running "$WORKER_CONTAINER"
stop_if_running "$APP_CONTAINER"
stop_if_running "$POSTGRES_CONTAINER"
stop_if_running "$MQTT_CONTAINER"

log "Stop complete"
