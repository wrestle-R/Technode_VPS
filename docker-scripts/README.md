# Docker Scripts Guide

This folder contains the operational scripts for the Technode Docker stack.

## Overview

The stack uses four containers:

- `technode-app` for the Next.js website and API
- `technode-worker` for the MQTT ingestion worker
- `technode-postgres` for the database
- `mqtt` or `mosquitto` for the MQTT broker

The app publishes port `3000` by default. Postgres and MQTT stay private unless you explicitly publish their ports.

The root `docker-scripts/` flow is local-first. It does not require Docker Hub as long as the needed images already exist locally or the MQTT broker container already exists.

## Files in This Folder

- `common.sh` shared script helpers and config loading
- `build-all.sh` build the three custom images locally
- `start-all.sh` start the full stack
- `stop-all.sh` stop all stack containers
- `health-check-all.sh` verify stack health
- `update-one.sh` rebuild and restart one service
- `update-many.sh` rebuild and restart multiple services
- `dockerhub/` Docker Hub specific pull and publish scripts

## Quick Start

### Local or VPS With Local Images

```bash
cp docker-scripts/.env.example docker-scripts/.env
./docker-scripts/build-all.sh
./docker-scripts/start-all.sh
./docker-scripts/health-check-all.sh
```

If your MQTT broker container already exists, `start-all.sh` will reuse it and only connect it to the configured Docker network when needed.

### VPS From Docker Hub Images

```bash
docker login
cp docker-scripts/.env.example docker-scripts/.env
```

Set these image names in `docker-scripts/.env`:

```bash
APP_IMAGE=wrestle66/technode-app:latest
WORKER_IMAGE=wrestle66/technode-worker:latest
POSTGRES_IMAGE=wrestle66/technode-postgres:latest
MQTT_IMAGE=wrestle66/technode-mosquitto:latest
```

Then run:

```bash
./docker-scripts/dockerhub/pull-images.sh
./docker-scripts/start-all.sh
./docker-scripts/health-check-all.sh
```

## Environment Variables

Important variables in `docker-scripts/.env`:

- `APP_IMAGE` image name for the website container
- `WORKER_IMAGE` image name for the MQTT worker
- `POSTGRES_IMAGE` image name for Postgres
- `MQTT_IMAGE` image name used only when the scripts need to create a new MQTT container
- `NEXT_PUBLIC_APP_URL` public app URL
- `APP_HEALTHCHECK_URL` endpoint used by the health check script
- `PRISMA_DATABASE_URL` runtime database URL for app and worker
- `BUILD_PRISMA_DATABASE_URL` optional build-time database URL for the app image
- `MQTT_CONTAINER` broker container name, default `mosquitto`
- `POSTGRES_HOST_PORT` optional host port for Postgres
- `MQTT_HOST_PORT` optional host port for MQTT
- `DOCKERHUB_NAMESPACE` optional default namespace for `docker-scripts/dockerhub/*.sh`
- `DOCKERHUB_TAG` optional default tag for `docker-scripts/dockerhub/*.sh`

## Script Reference

### `build-all.sh`

Use this when:

- you are setting up the stack for the first time
- you changed app, worker, or Docker files
- you want fresh local images

It builds:

- `APP_IMAGE`
- `WORKER_IMAGE`
- `POSTGRES_IMAGE`

### `start-all.sh`

Use this when you want the full stack running.

It:

- creates the private Docker network if needed
- creates the Postgres volume if needed
- starts Postgres
- reuses an existing MQTT container when present
- otherwise starts MQTT from `MQTT_IMAGE`
- starts the app and worker

### `stop-all.sh`

Use this when you want to stop all stack containers cleanly.

### `health-check-all.sh`

Use this when you want to verify the stack is actually up.

It checks:

- container running state
- Postgres readiness
- app HTTP readiness
- worker MQTT connection logs
- published ports when enabled

### `update-one.sh <service>`

Use this when you changed only one part of the stack.

Examples:

```bash
./docker-scripts/update-one.sh app
./docker-scripts/update-one.sh worker
./docker-scripts/update-one.sh postgres
./docker-scripts/update-one.sh mqtt
```

For `mqtt`, the script now prefers the existing container. It only needs `MQTT_IMAGE` if the container does not already exist.

### `update-many.sh <service...>`

Use this when you changed multiple services.

Examples:

```bash
./docker-scripts/update-many.sh app worker
./docker-scripts/update-many.sh all
```

## Docker Hub Script Reference

Docker Hub related commands now live under `docker-scripts/dockerhub/`.

### `dockerhub/pull-images.sh`

Pull the configured images from a registry.

### `dockerhub/publish-all.sh <namespace> [tag]`

Build and push all 4 images to Docker Hub.

Example:

```bash
./docker-scripts/dockerhub/publish-all.sh wrestle66 latest
```

This publishes:

- `wrestle66/technode-app:latest`
- `wrestle66/technode-worker:latest`
- `wrestle66/technode-postgres:latest`
- `wrestle66/technode-mosquitto:latest`

### `dockerhub/update-cloud.sh <namespace> [tag]`

Build and push only the website image to Docker Hub.

Example:

```bash
./docker-scripts/dockerhub/update-cloud.sh wrestle66 latest
```

## Common Notes

- The app build uses `PRISMA_DATABASE_URL` because some pages touch Prisma during build.
- The worker image includes dev dependencies so `tsx` is available.
- The broker container is reused if `MQTT_CONTAINER` already exists.
- Docker Hub image pages usually look like `https://hub.docker.com/r/<namespace>/<repository>`.

## Troubleshooting

- If `docker` says permission denied, make sure your user is in the `docker` group and restart your shell.
- If the MQTT image error appears, either create `MQTT_CONTAINER` first or set `MQTT_IMAGE` to a local image that already exists.
- If `docker-scripts/dockerhub/publish-all.sh` or `docker-scripts/dockerhub/update-cloud.sh` fails, confirm `docker login` succeeded.
- If the app health check fails, run `docker logs technode-app` and `./docker-scripts/health-check-all.sh` again.
- If Postgres or MQTT should be reachable from your host, set `POSTGRES_HOST_PORT` or `MQTT_HOST_PORT` in `docker-scripts/.env`.
