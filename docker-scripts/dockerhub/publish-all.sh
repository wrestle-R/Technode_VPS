#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../common.sh"

require_docker

namespace="${1:-${DOCKERHUB_NAMESPACE:-}}"
tag="${2:-${DOCKERHUB_TAG:-latest}}"
require_dockerhub_namespace "$namespace"

build_all_for_publish() {
  build_postgres_image
  build_app_image
  build_worker_image
}

build_all_for_publish

if ! docker image inspect "$MQTT_IMAGE" >/dev/null 2>&1; then
  log "Pulling MQTT image for publish: $MQTT_IMAGE"
  docker pull "$MQTT_IMAGE" >/dev/null
fi

app_remote="$(remote_image_ref "$namespace" technode-app "$tag")"
worker_remote="$(remote_image_ref "$namespace" technode-worker "$tag")"
postgres_remote="$(remote_image_ref "$namespace" technode-postgres "$tag")"
mqtt_remote="$(remote_image_ref "$namespace" technode-mosquitto "$tag")"

tag_and_push_image "$APP_IMAGE" "$app_remote"
tag_and_push_image "$WORKER_IMAGE" "$worker_remote"
tag_and_push_image "$POSTGRES_IMAGE" "$postgres_remote"
tag_and_push_image "$MQTT_IMAGE" "$mqtt_remote"

echo "[docker-scripts] Publish complete"
