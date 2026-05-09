#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_PYTHON="${VENV_DIR}/bin/python"

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  echo "[ems] python not found: ${PYTHON_BIN}" >&2
  exit 1
fi

if [[ ! -x "${VENV_PYTHON}" ]]; then
  echo "[ems] creating virtualenv at ${VENV_DIR}"
  "${PYTHON_BIN}" -m venv "${VENV_DIR}"
fi

if [[ ! -x "${VENV_PYTHON}" ]]; then
  echo "[ems] virtualenv python not found at ${VENV_PYTHON}" >&2
  exit 1
fi

if ! "${VENV_PYTHON}" -m pip --version >/dev/null 2>&1; then
  echo "[ems] bootstrapping pip in virtualenv"
  "${VENV_PYTHON}" -m ensurepip --upgrade
fi

echo "[ems] installing requirements"
"${VENV_PYTHON}" -m pip install --upgrade pip
"${VENV_PYTHON}" -m pip install -r "${SCRIPT_DIR}/requirements.txt"

echo "[ems] starting EMS publisher"
exec "${VENV_PYTHON}" -u "${SCRIPT_DIR}/fake_ems_device.py"
