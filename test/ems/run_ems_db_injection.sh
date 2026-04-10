#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  echo "[ems] python not found: ${PYTHON_BIN}" >&2
  exit 1
fi

if [[ ! -d "${VENV_DIR}" ]]; then
  echo "[ems] creating virtualenv at ${VENV_DIR}"
  "${PYTHON_BIN}" -m venv "${VENV_DIR}"
fi

# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"

echo "[ems] installing requirements"
python -m pip install --upgrade pip
python -m pip install -r "${SCRIPT_DIR}/requirements.txt"

echo "[ems] starting EMS DB injection"
exec python -u "${SCRIPT_DIR}/fake_ems_db_injection_25h.py"
