#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/common.sh"

usage() {
  cat <<'EOF'
Usage:
  ./docker-scripts/update-one.sh <service>

Services:
  app worker postgres mqtt
EOF
}

if [[ "${1:-}" == "" ]]; then
  usage
  exit 1
fi

service="$1"

require_docker
ensure_network
ensure_volume

case "$service" in
  app)
    build_app_image
    ensure_local_image "$APP_IMAGE"
    run_app
    ;;
  worker)
    build_worker_image
    ensure_local_image "$WORKER_IMAGE"
    run_worker
    ;;
  postgres)
    build_postgres_image
    ensure_local_image "$POSTGRES_IMAGE"
    run_postgres
    wait_for_postgres_ready 90
    ;;
  mqtt)
    docker pull "$MQTT_IMAGE"
    ensure_local_image "$MQTT_IMAGE"
    run_mqtt
    ensure_container_on_network "$MQTT_CONTAINER"
    ;;
  *)
    error "Unknown service: $service"
    usage
    exit 1
    ;;
esac

log "Update complete for service: $service"
