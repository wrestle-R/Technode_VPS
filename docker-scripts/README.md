# Docker Scripts Guide

Essential commands for the Technode Docker stack.

## Stack

- App: `technode-app`
- Worker: `technode-worker`
- Postgres: `technode-postgres`
- MQTT: `mosquitto`

## Local Setup

```bash
cp docker-scripts/.env.example docker-scripts/.env
./docker-scripts/pull-images.sh
./docker-scripts/build-all.sh
./docker-scripts/start-all.sh
./docker-scripts/health-check-all.sh
```

## VPS Setup

Use this when running from Docker Hub on your VPS.

### 1. Login

```bash
docker login
```

### 2. Pull your cloud images

Your Docker Hub images are:

- [wrestle66/technode-app](https://hub.docker.com/r/wrestle66/technode-app)
- [wrestle66/technode-worker](https://hub.docker.com/r/wrestle66/technode-worker)
- [wrestle66/technode-postgres](https://hub.docker.com/r/wrestle66/technode-postgres)
- [wrestle66/technode-mosquitto](https://hub.docker.com/r/wrestle66/technode-mosquitto)

Set your images in `docker-scripts/.env` like this:

```bash
APP_IMAGE=wrestle66/technode-app:latest
WORKER_IMAGE=wrestle66/technode-worker:latest
POSTGRES_IMAGE=wrestle66/technode-postgres:latest
MQTT_IMAGE=wrestle66/technode-mosquitto:latest
```

Then pull and run:

```bash
./docker-scripts/pull-images.sh
./docker-scripts/start-all.sh
./docker-scripts/health-check-all.sh
```

## Update Images

Push all 4 images to Docker Hub:

```bash
./docker-scripts/publish-all.sh wrestle66 latest
```

Push only the website image:

```bash
./docker-scripts/update-cloud.sh wrestle66 latest
```

## Stop Everything

```bash
./docker-scripts/stop-all.sh
```

## If You Change Code

```bash
./docker-scripts/update-one.sh app
./docker-scripts/update-one.sh worker
./docker-scripts/health-check-all.sh
```

## Notes

- `pull-images.sh` pulls the public MQTT base image.
- `build-all.sh` builds the 3 custom images locally.
- `start-all.sh` starts the app, worker, Postgres, and MQTT stack.
- `health-check-all.sh` checks container status and app readiness.
- Use `APP_HEALTHCHECK_URL` in `.env` if you want a different app health URL.
