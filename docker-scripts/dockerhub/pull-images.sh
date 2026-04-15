#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../common.sh"

require_docker

log "Pulling configured images"
docker pull "$APP_IMAGE"
docker pull "$WORKER_IMAGE"
docker pull "$POSTGRES_IMAGE"
docker pull "$MQTT_IMAGE"

log "Pull complete"
