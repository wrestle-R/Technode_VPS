#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/common.sh"

require_docker
ensure_local_image "$APP_IMAGE"
ensure_local_image "$WORKER_IMAGE"
ensure_local_image "$POSTGRES_IMAGE"
ensure_local_image "$MQTT_IMAGE"
ensure_network
ensure_volume

run_postgres
wait_for_postgres_ready 90
run_mqtt
ensure_container_on_network "$MQTT_CONTAINER"
run_app
run_worker

log "All containers started"
log "App URL: $NEXT_PUBLIC_APP_URL"
log "Run ./docker-scripts/health-check-all.sh for full status"
