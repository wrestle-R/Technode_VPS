#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/common.sh"

require_docker

status=0

check_running() {
  local container="$1"
  local label="$2"
  if container_running "$container"; then
    echo "[OK] $label container is running ($container)"
  else
    echo "[FAIL] $label container is not running ($container)"
    status=1
  fi
}

check_port() {
  local host="127.0.0.1"
  local port="$1"
  local label="$2"
  if timeout 2 bash -c "</dev/tcp/$host/$port" >/dev/null 2>&1; then
    echo "[OK] $label port is reachable ($host:$port)"
  else
    echo "[FAIL] $label port is not reachable ($host:$port)"
    status=1
  fi
}

check_http() {
  local url="$1"
  local label="$2"
  local attempts=15
  local wait_seconds=2
  local attempt
  local code

  for attempt in $(seq 1 "$attempts"); do
    code="$(curl -sS -o /dev/null -w '%{http_code}' "$url" || true)"
    if [[ "$code" =~ ^[234][0-9][0-9]$ ]]; then
      echo "[OK] $label HTTP check passed ($url, status $code)"
      return 0
    fi
    sleep "$wait_seconds"
  done

  echo "[FAIL] $label HTTP check failed ($url, last status ${code:-none}) after $((attempts * wait_seconds))s"
  status=1
}

check_running "$POSTGRES_CONTAINER" "Postgres"
check_running "$MQTT_CONTAINER" "MQTT"
check_running "$APP_CONTAINER" "App"
check_running "$WORKER_CONTAINER" "Worker"

if [[ -n "${POSTGRES_HOST_PORT:-}" ]]; then
  check_port "$POSTGRES_HOST_PORT" "Postgres"
else
  echo "[OK] Postgres host port not published; private network only"
fi

if [[ -n "${MQTT_HOST_PORT:-}" ]]; then
  check_port "$MQTT_HOST_PORT" "MQTT"
else
  echo "[OK] MQTT host port not published; private network only"
fi

check_port "$APP_PORT" "App"

if container_running "$POSTGRES_CONTAINER"; then
  if docker exec "$POSTGRES_CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    echo "[OK] Postgres reports ready"
  else
    echo "[FAIL] Postgres not ready"
    status=1
  fi
fi

check_http "$APP_HEALTHCHECK_URL" "App"

if container_running "$WORKER_CONTAINER"; then
  if docker logs --tail 80 "$WORKER_CONTAINER" 2>&1 | grep -q "\[ems:mqtt\] connected"; then
    echo "[OK] Worker connected to MQTT"
  else
    echo "[WARN] Worker running, but MQTT connection log not found yet"
  fi
fi

if [[ "$status" -eq 0 ]]; then
  echo "[docker-scripts] Overall status: HEALTHY"
else
  echo "[docker-scripts] Overall status: UNHEALTHY"
fi

exit "$status"
