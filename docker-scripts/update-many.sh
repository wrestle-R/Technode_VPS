#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./docker-scripts/update-many.sh <service...>
  ./docker-scripts/update-many.sh all

Services:
  app worker postgres mqtt
EOF
}

if [[ "$#" -eq 0 ]]; then
  usage
  exit 1
fi

if [[ "$1" == "all" ]]; then
  services=(postgres mqtt app worker)
else
  services=("$@")
fi

for service in "${services[@]}"; do
  "$SCRIPT_DIR/update-one.sh" "$service"
done

echo "[docker-scripts] Update complete for: ${services[*]}"
