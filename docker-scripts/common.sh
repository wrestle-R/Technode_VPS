#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NEXT_DIR="${NEXT_DIR:-$ROOT_DIR/next}"
CONFIG_FILE="${CONFIG_FILE:-$ROOT_DIR/docker-scripts/.env}"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

APP_IMAGE="${APP_IMAGE:-technode/app:dev}"
WORKER_IMAGE="${WORKER_IMAGE:-technode/worker:dev}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-technode/postgres:dev}"
MQTT_IMAGE="${MQTT_IMAGE:-eclipse-mosquitto:2}"

APP_CONTAINER="${APP_CONTAINER:-technode-app}"
WORKER_CONTAINER="${WORKER_CONTAINER:-technode-worker}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-technode-postgres}"
MQTT_CONTAINER="${MQTT_CONTAINER:-mosquitto}"

NETWORK_NAME="${NETWORK_NAME:-technode-net}"
POSTGRES_VOLUME="${POSTGRES_VOLUME:-technode-pgdata}"

APP_PORT="${APP_PORT:-3000}"
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-}"
MQTT_HOST_PORT="${MQTT_HOST_PORT:-}"

POSTGRES_DB="${POSTGRES_DB:-technode_vps}"
POSTGRES_USER="${POSTGRES_USER:-technode}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-technodepass}"
POSTGRES_HOST="${POSTGRES_HOST:-$POSTGRES_CONTAINER}"

NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:$APP_PORT}"
APP_HEALTHCHECK_URL="${APP_HEALTHCHECK_URL:-$NEXT_PUBLIC_APP_URL}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-change-me}"
MQTT_BROKER_URL="${MQTT_BROKER_URL:-mqtt://$MQTT_CONTAINER:1883}"

PRISMA_DATABASE_URL="${PRISMA_DATABASE_URL:-postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:5432/$POSTGRES_DB?schema=public}"

log() {
  printf '[docker-scripts] %s\n' "$*"
}

error() {
  printf '[docker-scripts] ERROR: %s\n' "$*" >&2
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    error "docker is not installed or not in PATH"
    exit 1
  fi
}

require_dockerhub_namespace() {
  local namespace="${1:-}"
  if [[ -z "$namespace" ]]; then
    error "Docker Hub namespace is required"
    error "Pass it as the first argument or set DOCKERHUB_NAMESPACE in docker-scripts/.env"
    exit 1
  fi
}

remote_image_ref() {
  local namespace="$1"
  local repository="$2"
  local tag="$3"
  printf '%s/%s:%s' "$namespace" "$repository" "$tag"
}

tag_and_push_image() {
  local local_image="$1"
  local remote_image="$2"

  log "Tagging $local_image as $remote_image"
  docker tag "$local_image" "$remote_image"

  log "Pushing $remote_image"
  docker push "$remote_image"
}

container_exists() {
  docker ps -a --format '{{.Names}}' | grep -Fxq "$1"
}

container_running() {
  docker ps --format '{{.Names}}' | grep -Fxq "$1"
}

container_on_network() {
  docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}' "$1" 2>/dev/null | grep -Fxq "$NETWORK_NAME"
}

ensure_container_on_network() {
  local name="$1"
  if container_exists "$name" && ! container_on_network "$name"; then
    log "Connecting $name to network: $NETWORK_NAME"
    docker network connect "$NETWORK_NAME" "$name" >/dev/null 2>&1 || true
  fi
}

remove_container_if_exists() {
  local name="$1"
  if container_exists "$name"; then
    log "Removing existing container: $name"
    docker rm -f "$name" >/dev/null
  fi
}

ensure_network() {
  if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    log "Creating network: $NETWORK_NAME"
    docker network create "$NETWORK_NAME" >/dev/null
  fi
}

ensure_volume() {
  if ! docker volume inspect "$POSTGRES_VOLUME" >/dev/null 2>&1; then
    log "Creating postgres volume: $POSTGRES_VOLUME"
    docker volume create "$POSTGRES_VOLUME" >/dev/null
  fi
}

ensure_local_image() {
  local image="$1"
  if ! docker image inspect "$image" >/dev/null 2>&1; then
    error "Image not found locally: $image"
    error "Pull it first with ./docker-scripts/pull-images.sh or build it via update scripts."
    exit 1
  fi
}

resolve_build_prisma_database_url() {
  local value="${BUILD_PRISMA_DATABASE_URL:-${PRISMA_DATABASE_URL:-}}"

  if [[ -z "$value" ]]; then
    local env_file
    local line
    for env_file in "$NEXT_DIR/.env" "$NEXT_DIR/.env.development"; do
      if [[ -f "$env_file" ]]; then
        line="$(grep -E '^PRISMA_DATABASE_URL=' "$env_file" | tail -n 1 || true)"
        if [[ -n "$line" ]]; then
          value="${line#PRISMA_DATABASE_URL=}"
          break
        fi
      fi
    done
  fi

  if [[ -z "$value" ]]; then
    error "PRISMA_DATABASE_URL not found for app image build"
    error "Set BUILD_PRISMA_DATABASE_URL in docker-scripts/.env or define PRISMA_DATABASE_URL in next/.env"
    exit 1
  fi

  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  value="${value//@localhost:/@host.docker.internal:}"
  value="${value//@127.0.0.1:/@host.docker.internal:}"

  printf '%s' "$value"
}

wait_for_postgres_ready() {
  local timeout="${1:-60}"
  local elapsed=0

  while (( elapsed < timeout )); do
    if docker exec "$POSTGRES_CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      log "Postgres is ready"
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done

  error "Postgres did not become ready within ${timeout}s"
  return 1
}

run_postgres() {
  remove_container_if_exists "$POSTGRES_CONTAINER"
  log "Starting postgres container: $POSTGRES_CONTAINER"
  local port_args=()
  if [[ -n "$POSTGRES_HOST_PORT" ]]; then
    port_args=(-p "$POSTGRES_HOST_PORT:5432")
  fi

  docker run -d \
    --name "$POSTGRES_CONTAINER" \
    --network "$NETWORK_NAME" \
    "${port_args[@]}" \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -e POSTGRES_USER="$POSTGRES_USER" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -v "$POSTGRES_VOLUME:/var/lib/postgresql/data" \
    "$POSTGRES_IMAGE" >/dev/null
}

run_mqtt() {
  if container_exists "$MQTT_CONTAINER"; then
    if ! container_running "$MQTT_CONTAINER"; then
      log "Starting existing mqtt container: $MQTT_CONTAINER"
      docker start "$MQTT_CONTAINER" >/dev/null
    else
      log "MQTT container already running: $MQTT_CONTAINER"
    fi
    ensure_container_on_network "$MQTT_CONTAINER"
    return 0
  fi

  log "Starting mqtt container: $MQTT_CONTAINER"
  local port_args=()
  if [[ -n "$MQTT_HOST_PORT" ]]; then
    port_args=(-p "$MQTT_HOST_PORT:1883")
  fi

  docker run -d \
    --name "$MQTT_CONTAINER" \
    --network "$NETWORK_NAME" \
    "${port_args[@]}" \
    "$MQTT_IMAGE" >/dev/null
}

run_app() {
  remove_container_if_exists "$APP_CONTAINER"
  log "Starting app container: $APP_CONTAINER"
  docker run -d \
    --name "$APP_CONTAINER" \
    --network "$NETWORK_NAME" \
    -p "$APP_PORT:3000" \
    -e PRISMA_DATABASE_URL="$PRISMA_DATABASE_URL" \
    -e NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
    -e ADMIN_USERNAME="$ADMIN_USERNAME" \
    -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    "$APP_IMAGE" >/dev/null
}

run_worker() {
  remove_container_if_exists "$WORKER_CONTAINER"
  log "Starting worker container: $WORKER_CONTAINER"
  docker run -d \
    --name "$WORKER_CONTAINER" \
    --network "$NETWORK_NAME" \
    -e PRISMA_DATABASE_URL="$PRISMA_DATABASE_URL" \
    -e MQTT_BROKER_URL="$MQTT_BROKER_URL" \
    "$WORKER_IMAGE" >/dev/null
}

build_app_image() {
  log "Building app image: $APP_IMAGE"
  local build_db_url
  build_db_url="$(resolve_build_prisma_database_url)"

  if docker buildx version >/dev/null 2>&1; then
    DOCKER_BUILDKIT=1 docker build \
      --add-host host.docker.internal:host-gateway \
      --build-arg PRISMA_DATABASE_URL="$build_db_url" \
      -f "$NEXT_DIR/Dockerfile.app" \
      -t "$APP_IMAGE" \
      "$NEXT_DIR"
  else
    docker build \
      --add-host host.docker.internal:host-gateway \
      --build-arg PRISMA_DATABASE_URL="$build_db_url" \
      -f "$NEXT_DIR/Dockerfile.app" \
      -t "$APP_IMAGE" \
      "$NEXT_DIR"
  fi
}

build_worker_image() {
  log "Building worker image: $WORKER_IMAGE"
  if docker buildx version >/dev/null 2>&1; then
    DOCKER_BUILDKIT=1 docker build -f "$NEXT_DIR/Dockerfile.worker" -t "$WORKER_IMAGE" "$NEXT_DIR"
  else
    docker build -f "$NEXT_DIR/Dockerfile.worker" -t "$WORKER_IMAGE" "$NEXT_DIR"
  fi
}

build_postgres_image() {
  log "Building postgres image: $POSTGRES_IMAGE"
  if docker buildx version >/dev/null 2>&1; then
    DOCKER_BUILDKIT=1 docker build -f "$NEXT_DIR/Dockerfile.postgres" -t "$POSTGRES_IMAGE" "$NEXT_DIR"
  else
    docker build -f "$NEXT_DIR/Dockerfile.postgres" -t "$POSTGRES_IMAGE" "$NEXT_DIR"
  fi
}
