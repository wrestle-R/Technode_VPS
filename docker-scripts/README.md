# Docker Scripts Guide

This folder contains operational scripts for the Technode local/VPS Docker stack.

## Stack Components

- App container: `technode-app`
- Worker container: `technode-worker`
- Postgres container: `technode-postgres`
- MQTT container: `mosquitto` (reused if already present)

By default, Postgres and MQTT are private on the Docker network. App is published to host on port `3000`.

## Configuration

Copy env template once:

```bash
cp docker-scripts/.env.example docker-scripts/.env
```

Important variables in `docker-scripts/.env`:

- `NEXT_PUBLIC_APP_URL` app base URL
- `APP_HEALTHCHECK_URL` app health target (default is app root)
- `PRISMA_DATABASE_URL` runtime DB URL for app/worker
- `BUILD_PRISMA_DATABASE_URL` optional build-only DB URL for app image build
- `MQTT_CONTAINER` defaults to `mosquitto`
- `POSTGRES_HOST_PORT` and `MQTT_HOST_PORT` optional host port publishing

## Scripts and When to Use

### `pull-images.sh`
Use when:
- You want to fetch public base/runtime images before building locally.

What it does:
- Pulls `eclipse-mosquitto:2`.

### `build-all.sh`
Use when:
- First setup.
- You changed app/worker/docker files and need fresh images.

What it does:
- Builds `technode/postgres:dev`, `technode/app:dev`, `technode/worker:dev`.

### `start-all.sh`
Use when:
- You want the full stack running.

What it does:
- Ensures network + volume.
- Starts Postgres and waits for readiness.
- Reuses existing `mosquitto` container or starts one.
- Starts app + worker.

### `stop-all.sh`
Use when:
- You want to stop all stack containers cleanly.

What it does:
- Stops worker, app, postgres, and mqtt containers if running.

### `update-one.sh <service>`
Use when:
- You changed only one service.

Examples:

```bash
./docker-scripts/update-one.sh app
./docker-scripts/update-one.sh worker
./docker-scripts/update-one.sh postgres
./docker-scripts/update-one.sh mqtt
```

### `update-many.sh <service...>`
Use when:
- You changed multiple services.

Examples:

```bash
./docker-scripts/update-many.sh app worker
./docker-scripts/update-many.sh all
```

### `health-check-all.sh`
Use when:
- You want one command to confirm stack health.

What it checks:
- Container running status.
- Published ports (if enabled).
- Postgres readiness.
- App HTTP readiness on `APP_HEALTHCHECK_URL` (passes on 2xx/3xx/4xx, fails on 5xx or no response).
- Worker MQTT connection log.

## Recommended Daily Flow

```bash
./docker-scripts/pull-images.sh
./docker-scripts/build-all.sh
./docker-scripts/start-all.sh
./docker-scripts/health-check-all.sh
```

After code changes:

```bash
./docker-scripts/update-one.sh app
./docker-scripts/update-one.sh worker
./docker-scripts/health-check-all.sh
```

Stop stack:

```bash
./docker-scripts/stop-all.sh
```

## Docker vs Normal Development Test Status

- Docker flow: validated via build/start/health scripts in this workspace.
- Normal development flow (`npm run dev`): this is your native local flow and should still work; use your existing local DB and broker env.

Quick normal-dev check:

```bash
cd next
npm run dev
```

Quick docker check:

```bash
cd /home/rdp/Desktop/code/Technode_VPS
./docker-scripts/health-check-all.sh
```
