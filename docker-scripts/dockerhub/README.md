# Docker Hub Scripts

This folder contains the scripts that explicitly depend on Docker Hub.

- `pull-images.sh` pulls the configured images from a registry
- `publish-all.sh` builds and pushes all stack images
- `update-cloud.sh` builds and pushes only the app image

Main stack operations stay in `docker-scripts/` and do not require Docker Hub when the needed local images or existing containers are already present.
