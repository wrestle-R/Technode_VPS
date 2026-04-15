#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../common.sh"

require_docker

namespace="${1:-${DOCKERHUB_NAMESPACE:-}}"
tag="${2:-${DOCKERHUB_TAG:-latest}}"
require_dockerhub_namespace "$namespace"

build_app_image

app_remote="$(remote_image_ref "$namespace" technode-app "$tag")"
tag_and_push_image "$APP_IMAGE" "$app_remote"

echo "[docker-scripts] Cloud app publish complete"
