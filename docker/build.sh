#!/bin/sh
# Builds the IOSignal server image.
#   ./build.sh                          # this computer's platform only, loaded locally (testing)
#   PLATFORMS=all ./build.sh            # every supported platform, loaded locally (needs the containerd image store)
#   PLATFORMS=linux/arm/v7 ./build.sh   # only the listed platforms
#   PUSH=1 ./build.sh                   # every supported platform, pushed to the registry (log in first:
#                                       # docker login ghcr.io); also tags <major>.<minor> and <major>
#
# Supported platforms (node:22-alpine, arm/v7 on node:22-bookworm-slim):
#   linux/amd64     PCs, servers, cloud
#   linux/arm64     Raspberry Pi 3/4/5 with a 64-bit OS, Apple silicon, ARM servers
#   linux/arm/v7    Raspberry Pi 2/3/4 with a 32-bit OS (Debian base)
#   linux/arm/v6    Raspberry Pi Zero / Zero W / 1
set -eu
cd "$(dirname "$0")"

IMAGE=${IMAGE:-ghcr.io/remocons/iosignal}
ALL=linux/amd64,linux/arm64,linux/arm/v7,linux/arm/v6
PUSH=${PUSH:-0}
if [ "$PUSH" = 1 ]; then
  PLATFORMS=${PLATFORMS:-all}
else
  PLATFORMS=${PLATFORMS:-linux/$(docker version -f '{{.Server.Arch}}')}
fi
[ "$PLATFORMS" = all ] && PLATFORMS=$ALL
CLI=$(node -p "require('./package-lock.json').packages['node_modules/iosignal-cli'].version")
CORE=$(node -p "require('./package-lock.json').packages['node_modules/iosignal'].version")
REV=$(git -C .. rev-parse --short HEAD 2>/dev/null || echo unknown)
MINOR=${CLI%.*}
MAJOR=${CLI%%.*}

TITLE=iosignal
DESCRIPTION="IOSignal server (io-server from iosignal-cli): WebSocket, CongSocket for Arduino, device control page"
SOURCE=https://github.com/remocons/iosignal-cli
DOCS=https://docs.iosignal.net/docs/server/cli-server/

set -- --platform "$PLATFORMS" \
  --label org.opencontainers.image.title=$TITLE \
  --label org.opencontainers.image.description="$DESCRIPTION" \
  --label org.opencontainers.image.source=$SOURCE \
  --label org.opencontainers.image.documentation=$DOCS \
  --label org.opencontainers.image.licenses=MIT \
  --label org.opencontainers.image.version="$CLI" \
  --label org.opencontainers.image.revision="$REV" \
  --label net.iosignal.core.version="$CORE" \
  -t "$IMAGE:$CLI" -t "$IMAGE:$CLI-core$CORE" -t "$IMAGE:latest"

if [ "$PUSH" = 1 ]; then
  # A multi-platform image is an index: GHCR shows its description and source link from index annotations.
  set -- "$@" -t "$IMAGE:$MINOR" -t "$IMAGE:$MAJOR" --push \
    --annotation "index:org.opencontainers.image.title=$TITLE" \
    --annotation "index:org.opencontainers.image.description=$DESCRIPTION" \
    --annotation "index:org.opencontainers.image.source=$SOURCE" \
    --annotation "index:org.opencontainers.image.licenses=MIT" \
    --annotation "index:org.opencontainers.image.version=$CLI"
  echo "pushing $IMAGE:$CLI, $CLI-core$CORE, $MINOR, $MAJOR, latest for $PLATFORMS"
else
  set -- "$@" --load
fi

docker buildx build "$@" .
echo "built $IMAGE:$CLI (iosignal-cli $CLI, iosignal $CORE) for $PLATFORMS$([ "$PUSH" = 1 ] && echo ', pushed')"
