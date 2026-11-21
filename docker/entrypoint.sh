#!/bin/sh
# Starts io-server. With arguments they are passed on unchanged (docker run <image> -l 7777 ...).
# Without arguments the image runs everything it can:
#   -l 7777 -L 55488 --web                         WebSocket + device control page, CongSocket for Arduino
#   --site /data/www                               when the folder exists (the image has the starter pages)
#   --devices /data/devices --no-devices-watch     only with IOSIGNAL_DEVICES=1 and *.device.js/json files
#                                                  there (the image has the starter devices): virtual devices
#                                                  look like real ones to every app on the LAN, so they are off
#   --dashboard --dashboard-access token           when IOSIGNAL_DASHBOARD_TOKEN is set (8+ characters)
# Mount your own folders over /data/www and /data/devices to replace the starter ones.
set -eu

if [ "$#" -gt 0 ]; then
  exec io-server "$@"
fi

set -- -l 7777 -L 55488 --web

if [ -d /data/www ]; then
  set -- "$@" --site /data/www
fi

if [ "${IOSIGNAL_DEVICES:-0}" = 1 ] && [ -d /data/devices ] \
  && find /data/devices -maxdepth 1 \( -name '*.device.js' -o -name '*.device.mjs' -o -name '*.device.json' \) | grep -q .; then
  set -- "$@" --devices /data/devices --no-devices-watch
fi

if [ -n "${IOSIGNAL_DASHBOARD_TOKEN:-}" ]; then
  set -- "$@" --dashboard --dashboard-access token
fi

echo "io-server $*"
exec io-server "$@"
