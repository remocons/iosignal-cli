#!/bin/sh
# Runs the built image as a server and checks it from a second container of the same image.
#   ./test/smoke.sh [image]            PLATFORM=linux/arm/v7 ./test/smoke.sh  (emulated)
set -eu
cd "$(dirname "$0")"
IMAGE=${1:-ghcr.io/remocons/iosignal:latest}
PLATFORM=${PLATFORM:-}
P=${PLATFORM:+--platform $PLATFORM}
NET=iosignal-smoke
NAME=iosignal-smoke-server

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; docker network rm "$NET" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup
docker network create "$NET" >/dev/null

docker run -d $P --name "$NAME" --network "$NET" "$IMAGE" \
  -l 7777 -L 55488 --web --dashboard -a reply -e smoke.smoke-key.smoke \
  --devices /app/node_modules/iosignal/dist/devices/examples/lamp.device.js --no-devices-watch >/dev/null

# wait for the health check
i=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$NAME")" = healthy ]; do
  i=$((i + 1)); [ $i -gt 90 ] && { docker logs "$NAME"; echo "FAIL server not healthy"; exit 1; }
  sleep 1
done
echo "ok   health check"

docker run --rm $P --network "$NET" -v "$PWD/smoke.mjs:/app/smoke.mjs:ro" \
  --entrypoint node "$IMAGE" /app/smoke.mjs "$NAME"

user=$(docker exec "$NAME" id -un)
[ "$user" = node ] && echo "ok   runs as $user" || { echo "FAIL runs as $user"; exit 1; }

start=$(date +%s)
docker stop -t 10 "$NAME" >/dev/null
code=$(docker inspect -f '{{.State.ExitCode}}' "$NAME")
took=$(( $(date +%s) - start ))
[ "$code" = 0 ] && [ $took -lt 5 ] && echo "ok   SIGTERM stop (exit $code, ${took}s)" \
  || { docker logs "$NAME"; echo "FAIL stop: exit $code after ${took}s"; exit 1; }

# Default start (no arguments): once as it is (no devices, no dashboard), once with a token and IOSIGNAL_DEVICES=1.
defaults() { # $1 label, $2 expected device count, $3 dashboard on|off, rest: docker run options
  label=$1 want=$2 dash=$3; shift 3
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker run -d $P --name "$NAME" --network "$NET" "$@" "$IMAGE" >/dev/null
  i=0
  until [ "$(docker inspect -f '{{.State.Health.Status}}' "$NAME")" = healthy ]; do
    i=$((i + 1)); [ $i -gt 90 ] && { docker logs "$NAME"; echo "FAIL $label: not healthy"; exit 1; }
    sleep 1
  done
  sleep 2 # the virtual devices connect after the server
  echo "ok   $label: $(docker logs "$NAME" 2>&1 | grep -m1 '^io-server ')"
  docker run --rm $P --network "$NET" -v "$PWD/smoke-defaults.mjs:/app/smoke-defaults.mjs:ro" \
    --entrypoint node "$IMAGE" /app/smoke-defaults.mjs "$NAME" "$want" "$dash"
}
defaults "no arguments" 0 off
defaults "no arguments, dashboard token, IOSIGNAL_DEVICES=1" 6 on -e IOSIGNAL_DASHBOARD_TOKEN=smoke-dashboard-token -e IOSIGNAL_DEVICES=1
echo "smoke test passed${PLATFORM:+ ($PLATFORM)}"
