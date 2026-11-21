# syntax=docker/dockerfile:1
# IOSignal server image: the published npm packages pinned in package.json / package-lock.json.
# Build with ./build.sh (it adds the version tags and labels).

ARG NODE_IMAGE=node:22.23.5-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a
# linux/arm/v7 (Raspberry Pi with a 32-bit OS) runs on Debian slim: Alpine's 32-bit ARM Node never
# started under QEMU in our tests, while the Debian one passes the smoke test. Debian has no arm/v6,
# so arm/v6 stays on Alpine.
ARG NODE_IMAGE_DEBIAN=node:22.23.5-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee
ARG TARGETOS TARGETARCH TARGETVARIANT

# node_modules is plain JavaScript, so it is installed once on the build machine's own platform
# and copied into every target platform (no npm under emulation).
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --omit=optional and --ignore-scripts: no native modules (iosignal 9.23 has no optional ones; ws uses
# JavaScript), so every platform installs without build tools.
RUN npm ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund && npm cache clean --force

# Runtime base per target platform: base-<os>-<arch><variant>.
FROM ${NODE_IMAGE} AS base-linux-amd64
FROM ${NODE_IMAGE} AS base-linux-arm64
FROM ${NODE_IMAGE} AS base-linux-arm64v8
FROM ${NODE_IMAGE_DEBIAN} AS base-linux-armv7
FROM ${NODE_IMAGE} AS base-linux-armv6

FROM base-${TARGETOS}-${TARGETARCH}${TARGETVARIANT}
ENV NODE_ENV=production \
    PATH=/app/node_modules/.bin:$PATH \
    HEALTH_PORT=7777
COPY --from=deps /app /app
# /data: working directory for -f log files and mounted auth files. It also holds the starter pages and
# virtual devices of io-init (iosignal-cli templates/starter): the default start serves the pages, and runs the
# devices only with IOSIGNAL_DEVICES=1. Mount your own folders over /data/www and /data/devices to replace them.
RUN install -d -o node -g node /data \
 && cp -R /app/node_modules/iosignal-cli/templates/starter/www /data/www \
 && cp -R /app/node_modules/iosignal-cli/templates/starter/devices /data/devices
COPY --chmod=755 entrypoint.sh /usr/local/bin/iosignal-start
WORKDIR /data
USER node
# 7777 WebSocket and pages, 55488 CongSocket (TCP): the port Arduino IOSignal connects to by default.
EXPOSE 7777 55488
# GET /healthz on the WebSocket port ({"status":"ok"}; 503 while closing). Set HEALTH_PORT when the server
# listens elsewhere. BusyBox wget (Alpine) answers at once; starting node for every check takes seconds on a
# Raspberry Pi Zero, so node is only the fallback (Debian slim, arm/v7, has no wget).
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --start-interval=2s --retries=3 \
  CMD if command -v wget >/dev/null; then wget -q -O /dev/null "http://127.0.0.1:${HEALTH_PORT}/healthz"; \
      else node -e "fetch('http://127.0.0.1:'+process.env.HEALTH_PORT+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"; fi
# Arguments go to io-server unchanged. Without any, iosignal-start runs -l 7777 -L 55488 --web with the pages
# in /data/www, the virtual devices in /data/devices only with IOSIGNAL_DEVICES=1 and, when
# IOSIGNAL_DASHBOARD_TOKEN is set, the dashboard with token access (see entrypoint.sh).
ENTRYPOINT ["iosignal-start"]
